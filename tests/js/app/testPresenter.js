const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Presenter = imports.app.presenter;
const Utils = imports.tests.utils;

Gtk.init(null);

const TEST_CONTENT_DIR = Utils.get_test_content_srcdir();

const MockWidget = new Lang.Class({
    Name: 'MockWidget',
    Extends: GObject.Object,
    Properties: {
        'sensitive': GObject.ParamSpec.boolean('sensitive', '', '',
            GObject.ParamFlags.READABLE | GObject.ParamFlags.WRITABLE, true),
    },
});

const MockHomePage = new Lang.Class({
    Name: 'MockHomePage',
    Extends: GObject.Object,
    Signals: {
        'search-entered': {
            param_types: [GObject.TYPE_STRING],
        },
    },

    _init: function () {
        this.parent();
        this.search_box = {};
    },

    connect: function (signal, handler) {
        // Silently ignore signals that we aren't mocking
        if (GObject.signal_lookup(signal, MockHomePage.$gtype) === 0)
            return;
        this.parent(signal, handler);
    },
});

const MockView = new Lang.Class({
    Name: 'MockView',
    Extends: GObject.Object,
    Signals: {
        'search-entered': {
            param_types: [GObject.TYPE_STRING],
        },
    },

    _init: function () {
        this.parent();
        let connectable_object = {
            connect: function () {},
        };
        this.section_page = connectable_object;
        this.home_page = new MockHomePage();
        this.categories_page = connectable_object;
        this.article_page = connectable_object;
        this.lightbox = new GObject.Object();
        this.search_box = {};
        this.no_search_results_page = {};
        this.history_buttons = {
            forward_button: new MockWidget(),
            back_button: new MockWidget(),
        };
    },

    connect: function (signal, handler) {
        // Silently ignore signals that we aren't mocking
        if (GObject.signal_lookup(signal, MockView.$gtype) === 0)
            return;
        this.parent(signal, handler);
    },

    show_no_search_results_page: function () {},
    lock_ui: function () {},
    unlock_ui: function () {},
    present_with_time: function () {},
});

const MockEngine = new Lang.Class({
    Name: 'MockEngine',
    Extends: GObject.Object,

    _init: function () {
        this.parent();
        this.host = 'localhost';
        this.port = 3003;
        this.language = '';
    },

    get_object_by_id: function () {},
    get_ekn_id: function () {},
    get_objects_by_query: function () {},
});

const MockArticlePresenter = new Lang.Class({
    Name: 'MockArticlePresenter',
    Extends: GObject.Object,

    _init: function () {
        this.parent();
    },

    connect: function () {},
});

describe('Presenter', () => {
    let presenter;
    let data;
    let view;
    let engine;
    let article_presenter;
    let test_app_filename = TEST_CONTENT_DIR + 'app.json';

    beforeEach(() => {
        Utils.register_gresource();

        data = Utils.parse_object_from_path(test_app_filename);

        view = new MockView();
        engine = new MockEngine();
        article_presenter = new MockArticlePresenter();
        let application = new GObject.Object();
        application.application_id = 'foobar';
        presenter = new Presenter.Presenter(data, {
            application: application,
            article_presenter: article_presenter,
            engine: engine,
            view: view,
        });
        spyOn(presenter, 'record_search_metric');
    });

    it('can be constructed', () => {});

    it('can set title image on view from json', () => {
        expect(presenter.view.home_page.title_image_uri).toBe(data['titleImageURI']);
    });

    it('can set cards on view from json', () => {
        expect(data['sections'].map((section) => {
            return section['title'];
        })).toEqual(presenter.view.home_page.cards.map((card) => {
            return card.title;
        }));

        expect(data['sections'].map((section) => {
            return section['thumbnailURI'];
        })).toEqual(presenter.view.home_page.cards.map((card) => {
            return card.thumbnail_uri;
        }));

        expect(data['sections'].map((section) => {
            return section['featured'];
        })).toEqual(presenter.view.home_page.cards.map((card) => {
            return card.featured;
        }));
    });

    describe('searching from search box', function () {
        beforeEach(function () {
            spyOn(view, 'show_no_search_results_page');
            spyOn(engine, 'get_objects_by_query').and.callFake(function (query, callback) {
                callback(undefined, [], function () {});
            });
        });

        it('works from the title bar', function (done) {
            view.emit('search-entered', 'query not found');
            Mainloop.idle_add(function () {
                expect(engine.get_objects_by_query)
                    .toHaveBeenCalledWith(jasmine.objectContaining({
                        query: 'query not found',
                    }),
                    jasmine.any(Function));
                expect(view.show_no_search_results_page).toHaveBeenCalled();
                done();
                return GLib.SOURCE_REMOVE;
            });
        });

        it('works from the home page', function (done) {
            view.home_page.emit('search-entered', 'query not found');
            Mainloop.idle_add(function () {
                expect(engine.get_objects_by_query)
                    .toHaveBeenCalledWith(jasmine.objectContaining({
                        query: 'query not found',
                    }),
                    jasmine.any(Function));
                expect(view.show_no_search_results_page).toHaveBeenCalled();
                done();
                return GLib.SOURCE_REMOVE;
            });
        });

        it('records a metric when you search from the title bar', function (done) {
            view.emit('search-entered', 'query not found');
            Mainloop.idle_add(function () {
                expect(presenter.record_search_metric).toHaveBeenCalled();
                done();
                return GLib.SOURCE_REMOVE;
            });
        });

        it('records a metric when you search from the home page', function (done) {
            view.home_page.emit('search-entered', 'query not found');
            Mainloop.idle_add(function () {
                expect(presenter.record_search_metric).toHaveBeenCalled();
                done();
                return GLib.SOURCE_REMOVE;
            });
        });
    });
});