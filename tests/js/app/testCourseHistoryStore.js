const Eknc = imports.gi.EosKnowledgeContent;

const Actions = imports.app.actions;
const AppUtils = imports.app.utils;
const CourseHistoryStore = imports.app.courseHistoryStore;
const MockDispatcher = imports.tests.mockDispatcher;
const MockEngine = imports.tests.mockEngine;
const MockReadingHistoryModel = imports.tests.mockReadingHistoryModel;
const Pages = imports.app.pages;
const SetMap = imports.app.setMap;
const Utils = imports.tests.utils;

describe('CourseHistoryStore', function () {
    let store, dispatcher, engine, reading_history;

    beforeEach(function () {
        dispatcher = MockDispatcher.mock_default();
        reading_history = MockReadingHistoryModel.mock_default();
        engine = MockEngine.mock_default();
        store = new CourseHistoryStore.CourseHistoryStore();
        store.set_current_item_from_props({ page_type: Pages.HOME });
        spyOn(AppUtils, 'record_search_metric');
        let data = [
            {
                ekn_id: '1',
                title: 'Foo',
                child_tags: ['foo'],
            },
            {
                ekn_id: '2',
                title: 'Bar',
                child_tags: ['bar'],
            },
        ];
        let sets = data.map((obj) => Eknc.SetObjectModel.new_from_props(obj));
        engine.query_promise.and.returnValue(Promise.resolve({ models: sets }));
        SetMap.init_map_with_models(sets);
    });

    it('goes back to the home page when home button is clicked', function () {
        dispatcher.dispatch({
            action_type: Actions.HOME_CLICKED,
        });
        expect(store.get_current_item().page_type).toBe(Pages.HOME);
    });

    it('goes to the home page when launched from desktop', function () {
        dispatcher.dispatch({
            action_type: Actions.LAUNCHED_FROM_DESKTOP,
        });
        expect(store.get_current_item().page_type).toBe(Pages.HOME);
    });

    it('shows the set page when a set model is clicked', function () {
        let model = Eknc.SetObjectModel.new_from_props({
            ekn_id: 'ekn://foo/set',
        });
        dispatcher.dispatch({
            action_type: Actions.ITEM_CLICKED,
            model: model,
        });
        expect(store.get_current_item().page_type).toBe(Pages.SET);
    });

    it('updates current-subset when a subset model is clicked', function () {
        spyOn(store, 'set_current_subset');
        let model = Eknc.SetObjectModel.new_from_props({
            ekn_id: 'ekn://foo/set',
            tags: ['foo'],
        });
        dispatcher.dispatch({
            action_type: Actions.ITEM_CLICKED,
            model: model,
        });
        Utils.update_gui();
        expect(store.set_current_subset).toHaveBeenCalled();
    });

    function test_close_lightbox (action, descriptor) {
        it('closes the lightbox when ' + descriptor, function () {
            let model = Eknc.ArticleObjectModel.new_from_props({
                ekn_id: 'ekn://foo/bar',
            });
            let media_model = Eknc.MediaObjectModel.new_from_props({
                ekn_id: 'ekn://foo/pix',
            });
            store.set_current_item_from_props({
                page_type: Pages.ARTICLE,
                model: model,
                media_model: media_model,
            });
            dispatcher.dispatch({
                action_type: action,
            });
            expect(store.get_current_item().media_model).toBeNull();
        });
    }
    test_close_lightbox(Actions.LIGHTBOX_CLOSED, 'lightbox close clicked');
    test_close_lightbox(Actions.SEARCH_BOX_FOCUSED, 'search box focused');

    describe('when an article card is clicked', function () {
        let prev_model, next_model, model;
        beforeEach(function () {
            model = Eknc.ArticleObjectModel.new_from_props({
                ekn_id: 'ekn://test/article',
            });
            prev_model = Eknc.ArticleObjectModel.new_from_props({
                ekn_id: 'ekn://test/prev',
            });
            next_model = Eknc.ArticleObjectModel.new_from_props({
                ekn_id: 'ekn://test/next',
            });

            dispatcher.dispatch({
                action_type: Actions.ITEM_CLICKED,
                model: model,
                context: [prev_model, model, next_model],
                context_label: 'Some Context',
            });
        });

        it('shows it in lightbox', function () {
            expect(store.get_current_item().media_model).toBe(model);
        });
    });

    describe('when desktop search result opened', function () {
        let model;

        beforeEach(function () {
            model = Eknc.ArticleObjectModel.new_from_props({
                ekn_id: 'ekn:///foo',
            });
            engine.get_object_promise.and.returnValue(Promise.resolve(model));
            dispatcher.dispatch({
                action_type: Actions.DBUS_LOAD_ITEM_CALLED,
                query: 'foo',
                ekn_id: 'ekn:///foo',
            });
            Utils.update_gui();
        });

        it('loads an item', function () {
            expect(engine.get_object_promise).toHaveBeenCalled();
            expect(engine.get_object_promise.calls.mostRecent().args[0])
                .toBe('ekn:///foo');
        });

        it('goes to the article page', function () {
            expect(store.get_current_item().page_type).toBe(Pages.ARTICLE);
        });
    });
});
