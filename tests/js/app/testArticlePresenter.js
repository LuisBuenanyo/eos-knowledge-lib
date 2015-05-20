const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ArticleObjectModel = imports.search.articleObjectModel;
const ArticlePresenter = imports.app.articlePresenter;
const Utils = imports.tests.utils;

Gtk.init(null);

const TEST_CONTENT_DIR = Utils.get_test_content_srcdir();
const TEST_CONTENT_BUILDDIR = Utils.get_test_content_builddir();
const MOCK_ARTICLE_PATH = TEST_CONTENT_DIR + 'mexico.jsonld';

const MockView = new Lang.Class({
    Name: 'MockView',
    GTypeName: 'testArticlePresenter_MockView',
    Extends: GObject.Object,
    Signals: {
        'new-view-transitioned': {}
    },

    _init: function (props) {
        this.parent(props);
        this.toc = {
            connect: function () {},
        }
    },

    switch_in_content_view: function (view, animation_type) {
        this.emit('new-view-transitioned');
    },
});

describe('Article Presenter', function () {
    let presenter;
    let view;
    let mockArticleData;
    let articleObject;
    let webview;

    beforeEach(function (done) {
        Utils.register_gresource();

        let file = Gio.file_new_for_path(MOCK_ARTICLE_PATH);

        let [success, data] = file.load_contents(null);
        mockArticleData = JSON.parse(data);

        articleObject = new ArticleObjectModel.ArticleObjectModel.new_from_json_ld(mockArticleData, undefined, 1);

        view = new MockView();
        view.connect_after('new-view-transitioned', done);

        presenter = new ArticlePresenter.ArticlePresenter({
            article_view: view,
        });
        presenter.load_article(articleObject, EosKnowledgePrivate.LoadingAnimationType.NONE);
    });

    it('can be constructed', function () {});

    it('can set title and subtitle on view', function () {
        expect(view.title).toBe(articleObject.title);
    });

    it('can set toc section list', function () {
        let labels = [];
        for (let obj of mockArticleData['tableOfContents']) {
            if (!('hasParent' in obj)) {
                labels.push(obj['hasLabel']);
            }
        }
        expect(view.toc.section_list).toEqual(labels);
    });
});