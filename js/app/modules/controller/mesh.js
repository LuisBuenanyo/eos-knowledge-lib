// Copyright 2015 Endless Mobile, Inc.

const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;

const Actions = imports.app.actions;
const Compat = imports.app.compat.compat;
const Dispatcher = imports.app.dispatcher;
const Engine = imports.search.engine;
const Controller = imports.app.interfaces.controller;
const HistoryStore = imports.app.historyStore;
const MeshHistoryStore = imports.app.meshHistoryStore;
const Module = imports.app.interfaces.module;
const Pages = imports.app.pages;
const QueryObject = imports.search.queryObject;
const TabButton = imports.app.widgets.tabButton;
const TitleCard = imports.app.modules.card.title;

const RESULTS_SIZE = 10;

/**
 * Class: Mesh
 *
 * The Mesh controller model controls the Encyclopedia and presets formerly
 * known as templates A and B.
 * A very exploratory controller, the content is organized into categories and
 * may have filters, but can be reached through many different paths.
 */
const Mesh = new Module.Class({
    Name: 'Controller.Mesh',
    Extends: GObject.Object,
    Implements: [Controller.Controller],

    // Overridable in tests. Brand page should be visible for 2 seconds. The
    // transition is currently hardcoded to a slow fade over 500 ms.
    BRAND_PAGE_TIME_MS: 1500,

    _init: function (props) {
        this._launched_once = false;

        this.parent(props);

        let history = new MeshHistoryStore.MeshHistoryStore();
        HistoryStore.set_default(history);

        this._window = this.create_submodule('window', {
            application: this.application,
            visible: false,
        });
        Compat.add_preset_style_classes(this._window, this.template_type);

        this.load_theme();

        this._current_set_id = null;
        this._current_search_query = '';
        this._set_cancellable = new Gio.Cancellable();
        this._search_cancellable = new Gio.Cancellable();
        this._brand_page_timeout_id = 0;
        this._home_content_loaded = false;

        let dispatcher = Dispatcher.get_default();
        dispatcher.register((payload) => {
            switch(payload.action_type) {
                case Actions.NEED_MORE_ITEMS:
                    this._load_more_set_results();
                    break;
                case Actions.NEED_MORE_SEARCH:
                    this._load_more_search_results();
                    break;
            }
        });

        if (this.template_type !== 'encyclopedia') {
            // Connect signals
            this._window.connect('search-focused', this._on_search_focus.bind(this));
        }

        this._window.connect('key-press-event', this._on_key_press_event.bind(this));
        history.connect('changed', this._on_history_change.bind(this));
    },

    make_ready: function (cb=function () {}) {
        let query_obj = new QueryObject.QueryObject({
            limit: -1,
            tags_match_any: [ Engine.HOME_PAGE_TAG, 'EknSetObject' ],
            sort: QueryObject.QueryObjectSort.SEQUENCE_NUMBER,
        });
        Engine.get_default().get_objects_by_query(query_obj, null, (engine, inner_task) => {
            let [models] = engine.get_objects_by_query_finish(inner_task);

            // FIXME: This sorting should ideally happen in the arrangement
            // once it has a sort-by API.
            let sorted_models = models.sort((a, b) => {
                let sortVal = 0;
                if (a.featured)
                    sortVal--;
                if (b.featured)
                    sortVal++;
                return sortVal;
            });
            Dispatcher.get_default().dispatch({
                action_type: Actions.APPEND_SETS,
                models: sorted_models,
            });
        });

        this._window.make_ready(() => {
            this._home_content_loaded = true;
            this._show_home_if_ready();
        });
    },

    _on_history_change: function () {
        let history = HistoryStore.get_default();
        let item = history.get_current_item();
        let dispatcher = Dispatcher.get_default();
        dispatcher.dispatch({
            action_type: Actions.HIDE_MEDIA,
        });
        dispatcher.dispatch({
            action_type: Actions.CLEAR_HIGHLIGHTED_ITEM,
            model: item.model,
        });

        let search_text = '';
        switch (item.page_type) {
            case Pages.SEARCH:
                search_text = item.query;
                this._update_search_results(item);
                dispatcher.dispatch({
                    action_type: Actions.SHOW_SEARCH_PAGE,
                });
                break;
            case Pages.SET:
                this._update_set_results(item, () => {
                    dispatcher.dispatch({
                        action_type: Actions.SHOW_SET_PAGE,
                    });
                });
                break;
            case Pages.ARTICLE:
                if (this.template_type === 'B')
                    this._update_article_list();
                dispatcher.dispatch({
                    action_type: Actions.SHOW_ARTICLE,
                    model: item.model,
                    animation_type: this._get_article_animation_type(),
                });
                dispatcher.dispatch({
                    action_type: Actions.SHOW_ARTICLE_PAGE,
                });
                break;
            case Pages.HOME:
                if (history.get_items().length === 1) {
                    Dispatcher.get_default().dispatch({
                        action_type: Actions.SHOW_BRAND_PAGE,
                    });
                    this._brand_page_timeout_id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.BRAND_PAGE_TIME_MS, () => {
                        this._brand_page_timeout_id = 0;
                        this._show_home_if_ready();
                        return GLib.SOURCE_REMOVE;
                    });
                } else {
                    this._show_home_if_ready();
                }
                break;
        }
        dispatcher.dispatch({
            action_type: Actions.SET_SEARCH_TEXT,
            text: search_text,
        });
    },

    _show_home_if_ready: function () {
        let item = HistoryStore.get_default().get_current_item();
        if (!item || item.page_type !== Pages.HOME)
            return;
        if (!this._home_content_loaded)
            return;
        if (this._brand_page_timeout_id)
            return;
        Dispatcher.get_default().dispatch({
            action_type: Actions.SHOW_HOME_PAGE,
        });
    },

    _on_key_press_event: function (widget, event) {
        let keyval = event.get_keyval()[1];
        let state = event.get_state()[1];

        let dispatcher = Dispatcher.get_default();
        if (keyval === Gdk.KEY_Escape) {
            dispatcher.dispatch({
                action_type: Actions.HIDE_ARTICLE_SEARCH,
            });
        } else if (((state & Gdk.ModifierType.CONTROL_MASK) !== 0) &&
                    keyval === Gdk.KEY_f) {
            dispatcher.dispatch({
                action_type: Actions.SHOW_ARTICLE_SEARCH,
            });
        }
    },

    _get_article_animation_type: function () {
        // FIXME: move to article stack
        let history = HistoryStore.get_default();
        let direction = history.get_direction();
        let last_index = history.get_current_index();
        last_index += (direction === HistoryStore.Direction.BACKWARDS ? 1 : -1);
        let last_item = history.get_items()[last_index];
        if (!last_item || last_item.page_type !== Pages.ARTICLE)
            return EosKnowledgePrivate.LoadingAnimationType.NONE;
        if (direction === HistoryStore.Direction.BACKWARDS)
            return EosKnowledgePrivate.LoadingAnimationType.BACKWARDS_NAVIGATION;
        return EosKnowledgePrivate.LoadingAnimationType.FORWARDS_NAVIGATION;
    },

    _on_search_focus: function (view, focused) {
        // If the user focused the search box, ensure that the lightbox is hidden
        Dispatcher.get_default().dispatch({
            action_type: Actions.HIDE_MEDIA,
        });
    },

    _update_article_list: function () {
        HistoryStore.get_default().search_backwards(0, (item) => {
            if (item.query) {
                this._update_search_results(item);
                return true;
            }
            if (item.page_type === Pages.SET) {
                this._update_set_results(item);
                return true;
            }
            return false;
        });
        this._update_highlight();
    },

    _update_search_results: function (item) {
        let query_obj = new QueryObject.QueryObject({
            query: item.query,
            limit: RESULTS_SIZE,
            tags_match_any: ['EknArticleObject'],
        });
        let dispatcher = Dispatcher.get_default();
        if (this._current_search_query === item.query) {
            dispatcher.dispatch({
                action_type: Actions.SEARCH_READY,
                query: item.query,
            });
            return;
        }
        this._current_search_query = item.query;

        dispatcher.dispatch({
            action_type: Actions.SEARCH_STARTED,
            query: item.query,
        });
        this._search_cancellable.cancel();
        this._search_cancellable.reset();
        this._more_search_results_query = null;
        Engine.get_default().get_objects_by_query(query_obj, this._search_cancellable, (engine, task) => {
            let results, get_more_results_query;
            try {
                [results, get_more_results_query] = engine.get_objects_by_query_finish(task);
            } catch (error) {
                if (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    return;
                logError(error);
                dispatcher.dispatch({
                    action_type: Actions.SEARCH_FAILED,
                    query: item.query,
                    error: new Error('Search failed for unknown reason'),
                });
                return;
            }
            this._more_search_results_query = get_more_results_query;

            dispatcher.dispatch({
                action_type: Actions.CLEAR_SEARCH,
            });
            dispatcher.dispatch({
                action_type: Actions.APPEND_SEARCH,
                models: results,
                query: item.query,
            });
            this._update_highlight();
            dispatcher.dispatch({
                action_type: Actions.SEARCH_READY,
                query: item.query,
            });
        });
    },

    _load_more_search_results: function () {
        if (!this._more_search_results_query)
            return;
        Engine.get_default().get_objects_by_query(this._more_search_results_query, this._search_cancellable, (engine, task) => {
            let results, get_more_results_query;
            try {
                [results, get_more_results_query] = engine.get_objects_by_query_finish(task);
            } catch (error) {
                if (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    return;
                logError(error);
                return;
            }
            if (!results)
                return;

            let dispatcher = Dispatcher.get_default();
            this._update_highlight();
            dispatcher.dispatch({
                action_type: Actions.APPEND_SEARCH,
                models: results,
            });
            this._more_search_results_query = get_more_results_query;
        });
        // Null the query to avoid double loading.
        this._more_search_results_query = null;
    },

    _update_set_results: function (item, callback=() => {}) {
        let query_obj = new QueryObject.QueryObject({
            tags_match_any: item.model.child_tags,
            limit: RESULTS_SIZE,
            sort: QueryObject.QueryObjectSort.SEQUENCE_NUMBER,
        });

        let dispatcher = Dispatcher.get_default();
        if (this._current_set_id === item.model.ekn_id) {
            dispatcher.dispatch({
                action_type: Actions.SET_READY,
                model: item.model,
            });
            callback();
            return;
        }
        this._current_set_id = item.model.ekn_id;

        dispatcher.dispatch({
            action_type: Actions.SHOW_SET,
            model: item.model,
        });
        this._set_cancellable.cancel();
        this._set_cancellable.reset();
        this._more_set_results_query = null;
        Engine.get_default().get_objects_by_query(query_obj, this._set_cancellable, (engine, task) => {
            let results, get_more_results_query;
            try {
                [results, get_more_results_query] = engine.get_objects_by_query_finish(task);
            } catch (error) {
                if (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    return;
                logError(error);
                callback();
                return;
            }
            this._more_set_results_query = get_more_results_query;

            dispatcher.dispatch({
                action_type: Actions.CLEAR_ITEMS,
            });
            dispatcher.dispatch({
                action_type: Actions.APPEND_ITEMS,
                models: results,
            });
            this._update_highlight();
            dispatcher.dispatch({
                action_type: Actions.SET_READY,
                model: item.model,
            });
            callback();
        });
    },

    _load_more_set_results: function () {
        if (!this._more_set_results_query)
            return;
        Engine.get_default().get_objects_by_query(this._more_set_results_query, this._set_cancellable, (engine, task) => {
            let results, get_more_results_query;
            try {
                [results, get_more_results_query] = engine.get_objects_by_query_finish(task);
            } catch (error) {
                if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    logError(error);
                return;
            }
            if (!results)
                return;

            let dispatcher = Dispatcher.get_default();
            this._update_highlight();
            dispatcher.dispatch({
                action_type: Actions.APPEND_ITEMS,
                models: results,
            });
            this._more_set_results_query = get_more_results_query;
        });
        // Null the query to avoid double loading.
        this._more_set_results_query = null;
    },

    _update_highlight: function () {
        let item = HistoryStore.get_default().get_current_item();
        if (item.page_type === Pages.ARTICLE) {
            Dispatcher.get_default().dispatch({
                action_type: Actions.HIGHLIGHT_ITEM,
                model: item.model,
            });
        }
    },
});
