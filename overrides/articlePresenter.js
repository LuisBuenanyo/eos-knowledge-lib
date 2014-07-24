const EosKnowledge = imports.gi.EosKnowledge;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

const ArticleObjectModel = imports.articleObjectModel;
const ArticlePage = imports.articlePage;
const Engine = imports.engine;
const MediaObjectModel = imports.mediaObjectModel;

GObject.ParamFlags.READWRITE = GObject.ParamFlags.READABLE | GObject.ParamFlags.WRITABLE;

/**
 * Class: ArticlePresenter
 *
 * A presenter module to act as a intermediary between an <ArticleObjectModel>
 * and an <ArticlePage>. It connects to signals on the view's widgets and handles
 * those events accordingly.
 *
 * Its properties are an <article-model>, <article-view> and a <engine>. The engine is for
 * communication with the Knowledge Engine server.
 */
const ArticlePresenter = new GObject.Class({
    Name: 'ArticlePresenter',
    GTypeName: 'EknArticlePresenter',

    Properties: {
        /**
         * Property: article-model
         *
         * The <ArticleObjectModel> handled by this widget.
         */
        'article-model': GObject.ParamSpec.object('article-model', 'Article model',
            'The article object model handled by this widget',
            GObject.ParamFlags.READWRITE, ArticleObjectModel.ArticleObjectModel),

        /**
         * Property: history-model
         *
         * The <HistoryModel> representing the user's article viewing history.
         */
        'history-model': GObject.ParamSpec.object('history-model', 'History model',
            'The history object model handled by this widget',
            GObject.ParamFlags.READWRITE, EosKnowledge.HistoryModel),

        /**
         * Property: article-view
         *
         * The <ArticlePage> widget created by this widget. Construct-only.
         */
        'article-view': GObject.ParamSpec.object('article-view', 'Article view',
            'The view component for this presenter',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ArticlePage.ArticlePage),

        /**
         * Property: engine
         *
         * The <Engine> widget created by this widget. Construct-only.
         */
        'engine': GObject.ParamSpec.object('engine', 'Engine module',
            'The engine module to connect to EKN',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Engine.Engine),
        /**
         * Property: template-type
         *
         * A string for the template type the window should render as
         * currently support 'A' and 'B' templates. Defaults to 'A'.
         */
        'template-type':  GObject.ParamSpec.string('template-type', 'Template Type',
            'Which template the window should display with',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY, 'A'),
        /**
         * Property: animate-load
         *
         * Set true if the ArticlePresenter should use the switcher to animate
         * in a new article from the right.
         */
        'animate-load': GObject.ParamSpec.boolean('animate-load', 'Animate load',
            'True if article presenter should animate in new articles.',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT, true),
    },
    Signals: {
        /**
         * Event: media-object-clicked
         * Emitted when a media URI in the article page is clicked.
         * Passes the ID of the media object that was clicked and whether it is
         * a resource of the parent article model.
         */
        'media-object-clicked': {
            param_types: [
                GObject.TYPE_OBJECT /* MediaContentObject */,
                GObject.TYPE_BOOLEAN /* Whether the media object is internal */
            ]
        }
    },

    // Duration of animated scroll from section to section in the page.
    _SCROLL_DURATION: 1000,

    _init: function (props) {
        this._history_model = null;

        this.parent(props);

        this.article_view.toc.transition_duration = this._SCROLL_DURATION;
        this._article_model = null;
        this._webview = null;

        this._connect_toc_widget();
        this._connect_switcher_widget();
    },

    get article_model () {
        if (this._article_model !== null)
            return this._article_model;
        return null;
    },

    get history_model () {
        return this._history_model;
    },

    set article_model (v) {
        if (this._article_model !== null && this._article_model.article_content_uri === v.article_content_uri)
            return;

        // fully populate the view from a model
        this._article_model = v;

        if (this.animate_load || this._webview === null) {
            this.article_view.switcher.load_uri(this._article_model.article_content_uri);
        } else {
            this._webview.load_uri(this._article_model.article_content_uri);
        }

        if (!this.animate_load)
            this._update_title_and_toc();
    },

    set history_model (v) {
        if (this._history_model === v)
            return;
        this._history_model = v;
        this.notify('history-model');
    },

    /**
     * Function: load_article
     * Loads an <ArticleObjectModel> and adds it to the viewing history
     * Parameters:
     *   model - the <ArticleObjectModel> to be loaded
     */
    load_article: function (model) {
        if (this._history_model) {
            this._history_model.current_item = new ArticleHistoryItem({
                title: model.title,
                article_model: model
            });
        }
        this.article_model = model;
    },

    /**
     * Function: navigate_back
     * Loads the previously viewed <ArticleObjectModel> with a 'navigate
     * backwards' animation.
     */
    navigate_back: function () {
        this._history_model.go_back();
        this.article_view.switcher.navigate_forwards = false;
        this.article_model = this._history_model.current_item.article_model;
    },

    /**
     * Function: navigate_forward
     * Loads the <ArticleObjectModel> viewed after the current one with a
     * 'navigate forwards' animation.
     */
    navigate_forward: function () {
        this._history_model.go_forward();
        this.article_view.switcher.navigate_forwards = true;
        this.article_model = this._history_model.current_item.article_model;
    },

    _update_title_and_toc: function () {
        this.article_view.title = this._article_model.title;

        let _toc_visible = false;
        if (this.template_type !== 'B' && this._article_model.table_of_contents !== undefined) {
            this._mainArticleSections = this._get_toplevel_toc_elements(this._article_model.table_of_contents);
            if (this._mainArticleSections.length > 0) {
                this.article_view.toc.section_list = this._mainArticleSections.map(function (section) {
                    return section.label;
                });
                _toc_visible = true;
            }
        }
        this.article_view.toc.visible = _toc_visible;
        this.notify('article-model');
    },

    _connect_switcher_widget: function () {
        this.article_view.switcher.connect('decide-navigation-policy', function (switcher, decision) {
            let [baseURI, hash] = decision.request.uri.split('#');
            let _resources = this._article_model.get_resources();
            let resourceURIs = _resources.map(function (model) {
                return model.content_uri;
            });

            // If the requested uri is just a hash, then we're
            // navigating within the current article, so don't
            // animate a new webview
            if (this._article_model.article_content_uri.indexOf(baseURI) === 0) {

                decision.use();
                return true;

            } else if (resourceURIs.indexOf(decision.request.uri) !== -1) {

                // Else, if the request corresponds to a media object in the
                // resources array, emit the bat signal!
                let media_object = _resources[resourceURIs.indexOf(decision.request.uri)];
                this.emit('media-object-clicked', media_object, true);

                decision.ignore();
                return true;

            } else {

                // Else, the request could be either for a media object
                // or a new article page
                let [domain, id] = baseURI.split('/').slice(-2);
                switcher.navigate_forwards = true;
                decision.ignore();

                this.engine.get_object_by_id(domain, id, function (err, model) {
                    if (typeof err === 'undefined') {
                        if (model instanceof MediaObjectModel.MediaObjectModel) {
                            this.emit('media-object-clicked', model, false);
                        } else {
                            this.load_article(model);
                        }
                    } else {
                        printerr(err);
                        printerr(err.stack);
                    }
                }.bind(this));
                return true;

            }
        }.bind(this));

        this.article_view.switcher.connect('create-webview', function () {
            // give us a local ref to the webview for direct navigation
            this._webview = this._get_connected_webview();
            return this._webview;
        }.bind(this));

        // Set the title and toc once the switcher view has finished loading
        this.article_view.switcher.connect('display-ready', this._update_title_and_toc.bind(this));
    },

    _connect_toc_widget: function () {
        this.article_view.toc.connect('up-clicked', function () {
            this._scroll_to_section(this.article_view.toc.selected_section - 1);
        }.bind(this));

        this.article_view.toc.connect('down-clicked', function () {
            this._scroll_to_section(this.article_view.toc.selected_section + 1);
        }.bind(this));

        this.article_view.toc.connect('section-clicked', function (widget, index) {
            this._scroll_to_section(index);
        }.bind(this));
    },

    _scroll_to_section: function (index) {
        // tells the webkit webview directly to scroll to a ToC entry
        let location = this._mainArticleSections[index].content;
        let script = 'scrollTo(' + location.toSource() + ', ' + this._SCROLL_DURATION + ');';
        this.article_view.toc.target_section = index;
        this._webview.run_javascript(script, null, null);
    },

    _get_toplevel_toc_elements: function (tree) {
        // ToC is flat, so just get the toplevel table of contents entries
        let [success, child_iter] = tree.get_iter_first();
        let toplevel_elements = [];
        while (success) {
            let label = tree.get_value(child_iter, EosKnowledge.TreeNodeColumn.LABEL);
            let indexLabel = tree.get_value(child_iter, EosKnowledge.TreeNodeColumn.INDEX_LABEL);
            let content = tree.get_value(child_iter, EosKnowledge.TreeNodeColumn.CONTENT);
            toplevel_elements.push({
                'label': label,
                'indexLabel': indexLabel,
                'content': content
            });

            success = tree.iter_next(child_iter);
        }

        return toplevel_elements;
    },

    _get_connected_webview: function () {
        let webview = new EosKnowledge.EknWebview();

        webview.inject_js_from_resource('resource:///com/endlessm/knowledge/scroll_manager.js');
        if (this.template_type === 'A')
            webview.inject_css_from_resource('resource:///com/endlessm/knowledge/hide_title.css');

        webview.connect('notify::uri', function () {
            if (webview.uri.indexOf('#') >= 0) {
                let hash = webview.uri.split('#')[1];

                // if we scrolled past something, update the ToC
                if(hash.indexOf('scrolled-past-') === 0) {

                    let sectionName = hash.split('scrolled-past-')[1];
                    let sectionIndex = -1;
                    // Find the index corresponding to this section
                    for (let index in this._mainArticleSections) {
                        let thisName = this._mainArticleSections[index].content.split("#")[1];
                        if (thisName === sectionName)
                            sectionIndex = index;
                    }

                    if (sectionIndex !== -1 &&
                        this.article_view.toc.target_section === this.article_view.toc.selected_section) {
                        this.article_view.toc.transition_duration = 0;
                        this.article_view.toc.target_section = sectionIndex;
                        this.article_view.toc.transition_duration = this._SCROLL_DURATION;
                    }
                }
            }
        }.bind(this));

        return webview;
    }
});

const ArticleHistoryItem = new Lang.Class({
    Name: 'ArticleHistoryItem',
    Extends: GObject.Object,
    Implements: [ EosKnowledge.HistoryItemModel ],
    Properties: {
        'title': GObject.ParamSpec.string('title', 'override', 'override',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ''),
        'article-model': GObject.ParamSpec.object('article-model', 'Article model',
            'The article object model handled by this widget',
            GObject.ParamFlags.READWRITE, ArticleObjectModel.ArticleObjectModel),
    }
});
