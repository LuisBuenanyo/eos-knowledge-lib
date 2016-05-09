const Gtk = imports.gi.Gtk;

const Utils = imports.tests.utils;
Utils.register_gresource();

const Actions = imports.app.actions;
const MockDispatcher = imports.tests.mockDispatcher;
const SearchBanner = imports.app.modules.searchBanner;

Gtk.init(null);

describe('Search banner widget', function () {
    let searchBanner, dispatcher;

    beforeEach(function () {
        dispatcher = MockDispatcher.mock_default();
        searchBanner = new SearchBanner.SearchBanner();
    });

    it('constructs', function () {});

    it('displays the query string somewhere when the search starts', function () {
        expect(Gtk.test_find_label(searchBanner, '*myfoobar*')).toBeNull();
        dispatcher.dispatch({
            action_type: Actions.SEARCH_STARTED,
            query: 'myfoobar',
        });
        Utils.update_gui();
        expect(Gtk.test_find_label(searchBanner, '*myfoobar*')).not.toBeNull();
    });

    it('displays the query string somewhere when the search is complete', function () {
        expect(Gtk.test_find_label(searchBanner, '*myfoobar*')).toBeNull();
        dispatcher.dispatch({
            action_type: Actions.SEARCH_READY,
            query: 'myfoobar',
        });
        Utils.update_gui();
        expect(Gtk.test_find_label(searchBanner, '*myfoobar*')).not.toBeNull();
    });
});