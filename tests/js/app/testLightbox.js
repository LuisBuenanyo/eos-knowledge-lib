const Gtk = imports.gi.Gtk;

const CssClassMatcher = imports.tests.CssClassMatcher;
const Lightbox = imports.app.lightbox;
const Utils = imports.tests.utils;

Gtk.init(null);

describe('Lightbox widget', function () {
    let lightbox, content_widget, infobox_widget, notify;

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);
        Utils.register_gresource();

        content_widget = new Gtk.Label();
        content_widget.show();
        infobox_widget = new Gtk.Label();
        infobox_widget.show();
        lightbox = new Lightbox.Lightbox({
            content_widget: content_widget,
            infobox_widget: infobox_widget,
            transition_duration: 0
        });
        lightbox.show();

        notify = jasmine.createSpy('notify');
        lightbox.connect('notify', function (object, pspec) {
            // Seems properties defined in js can only be accessed through
            // object[name] with the underscore variant on the name
            notify(pspec.name, object[pspec.name.replace('-', '_')]);
        });
    });

    it('can be constructed', function () {});

    it('overlays-revealed property follows reveal-overlays property', function () {
        // No animation time (and not mapped) so overlays-revealed should
        // update instantly
        lightbox.reveal_overlays = true;
        expect(lightbox.overlays_revealed).toBe(true);
        expect(notify).toHaveBeenCalledWith('overlays-revealed', true);
        lightbox.reveal_overlays = false;
        expect(lightbox.overlays_revealed).toBe(false);
        expect(notify).toHaveBeenCalledWith('overlays-revealed', false);
    });

    it('child visiblity matches overlays-revealed', function () {
        // We can't actually set overlays-revealed directly, so this test
        // relies on the 'overlays-revealed follows reveal-overlays' test to
        // pass
        lightbox.reveal_overlays = true;
        expect(lightbox.overlays_revealed).toBe(true);
        expect(content_widget.is_visible()).toBe(true);
        lightbox.reveal_overlays = false;
        expect(lightbox.overlays_revealed).toBe(false);
        expect(content_widget.is_visible()).toBe(false);
    });

    describe('Style class of Lightbox', function () {
        it('has lightbox class', function () {
            expect(lightbox).toHaveCssClass('lightbox');
        });
        // Since our lightbox container turns on lightbox shadow dynamically
        // in size allocate and draw, we can't test like this anymore
        xit('has a descendant with lightbox-shadow class', function () {
            expect(lightbox).toHaveDescendantWithCssClass('lightbox-shadow');
        });
        it('has a descendant with infobox class', function () {
            expect(lightbox).toHaveDescendantWithCssClass('infobox');
        });
    });

});