/* exported ContentGroup */

// Copyright 2016 Endless Mobile, Inc.

const Gtk = imports.gi.Gtk;

const Actions = imports.app.actions;
const Dispatcher = imports.app.dispatcher;
const Module = imports.app.interfaces.module;

const BATCH_SIZE = 15;

const CONTENT_PAGE_NAME = 'content';
const SPINNER_PAGE_NAME = 'spinner';

const ContentGroup = new Module.Class({
    Name: 'ContentGroup',
    Extends: Gtk.Grid,

    Slots: {
        'arrangement': {},
        'selection': {},
        'title': {},
    },

    _init: function (props={}) {
        this.parent(props);

        this._title = this.create_submodule('title');
        if (this._title)
            this.attach(this._title, 0, 0, 1, 1);
        this._arrangement = this.create_submodule('arrangement');
        this._arrangement.connect('card-clicked', (arrangement, model) => {
            Dispatcher.get_default().dispatch({
                action_type: Actions.ITEM_CLICKED,
                model: model,
                context: this._selection.get_models(),
            });
        });

        let stack = new Gtk.Stack();
        let spinner = new Gtk.Spinner();
        stack.add_named(spinner, SPINNER_PAGE_NAME);
        stack.add_named(this._arrangement, CONTENT_PAGE_NAME);

        // When the spinner is not being shown on screen, set it to
        // be inactive to help with performance.
        stack.connect('notify::visible-child', () => {
            spinner.active = stack.visible_child_name === SPINNER_PAGE_NAME;
        });

        this._selection = this.create_submodule('selection');
        this._selection.connect('models-changed',
            this._on_models_changed.bind(this));
        this._selection.connect('notify::loading', () => {
            stack.visible_child_name = this._selection.loading ? SPINNER_PAGE_NAME : CONTENT_PAGE_NAME;
        });

        this.attach(stack, 0, 1, 1, 1);
    },

    make_ready: function (cb=function () {}) {
        this.load();
        this._title.make_ready(cb);
    },

    get_selection: function () {
        return this._selection;
    },

    _on_models_changed: function () {
        let models = this._selection.get_models();
        let max_cards = this._arrangement.get_max_cards();
        if (max_cards > -1)
            models.splice(max_cards);
        this._arrangement.set_models(models);
    },

    load: function () {
        let cards_to_load = BATCH_SIZE;
        let max_cards = this._arrangement.get_max_cards();
        if (max_cards > -1)
            cards_to_load = max_cards;
        this._selection.queue_load_more(cards_to_load);
    },
});