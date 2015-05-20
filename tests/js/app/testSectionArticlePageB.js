const Gtk = imports.gi.Gtk;

const CssClassMatcher = imports.tests.CssClassMatcher;
const SectionArticlePage = imports.app.sectionArticlePage;
const StyleClasses = imports.app.styleClasses;

Gtk.init(null);

describe ('Section Article Page B', function () {
    let the_section_article_page;

    beforeEach (function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);

        the_section_article_page = new SectionArticlePage.SectionArticlePageB();
        the_section_article_page.show_all();
    });

    it ('can be constructed', function () {
        expect(the_section_article_page).toBeDefined();
    });

    it ('has a back button with the correct CSS class', function () {
        expect(the_section_article_page).toHaveDescendantWithCssClass(StyleClasses.NAV_BACK_BUTTON);
    });
});