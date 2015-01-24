const EosKnowledge = imports.gi.EosKnowledge;
const Endless = imports.gi.Endless;
const Gtk = imports.gi.Gtk;

const CssClassMatcher = imports.CssClassMatcher;

const TESTDIR = Endless.getCurrentFileDir() + '/..';

describe('Home page for Template A', function () {
    let home_page;
    let card_list = [
            new EosKnowledge.Card({
                title: 'Synopsised Card',
                synopsis: 'This is the Synopsis',
                featured: false,
            }),
            new EosKnowledge.Card({
                title: 'Featured Picture Card',
                thumbnail_uri: TESTDIR + '/test-content/pig1.jpg',
                featured: true,
            }),
            new EosKnowledge.Card({
                title: 'Everything card',
                synopsis: 'This card has everything',
                thumbnail_uri: TESTDIR + '/test-content/pig2.jpg',
                featured: true,
            }),
            new EosKnowledge.LessonCard({
                title: 'Mustard lesson',
                synopsis: 'Sample, incomplete',
                // By Bogdan29roman, CC-BY-SA
                // http://en.wikipedia.org/wiki/File:Mu%C5%9Ftar.jpg
                thumbnail_uri: TESTDIR + '/test-content/mustard.jpg',
                item_index: 1,
                complete: false,
                featured: false,
            })
        ];

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);

        home_page = new EosKnowledge.HomePageA();

        notify = jasmine.createSpy('notify');
        home_page.connect('notify', function (object, pspec) {
            // Seems properties defined in js can only be accessed through
            // object[name] with the underscore variant on the name
            notify(pspec.name, object[pspec.name.replace('-', '_')]);
        });

    });

    it('can be constructed', function () {});

    it('can set cards', function () {
        // Seems worth testing this as having a list property in javascript
        // isn't common
        home_page.cards = card_list;

        let get_title = (card) => card.title;

        // sort existing/expected lists alphabetically for comparing members
        // independent of pack_cards implementation
        let expected_card_list = card_list.map(get_title).sort();
        let existing_card_list = home_page.cards.map(get_title).sort();
        expect(existing_card_list).toEqual(expected_card_list);
    });

    it('orders featured cards first', function () {
        home_page.cards = card_list;

        expect(home_page.cards.map((card) => card.featured)).toEqual([
            true,
            true,
            false,
            false,
        ]);
    });

    describe('Style class of table of contents', function () {
        it('has home_page class', function () {
            expect(home_page).toHaveCssClass(EosKnowledge.STYLE_CLASS_HOME_PAGE_A);
        });
        it('has a descendant with search box class', function () {
            expect(home_page).toHaveDescendantWithCssClass(EosKnowledge.STYLE_CLASS_SEARCH_BOX);
        });
        it('has a descendant with container class', function () {
            expect(home_page).toHaveDescendantWithCssClass(EosKnowledge.STYLE_CLASS_CARD_CONTAINER);
        });
    });
});
