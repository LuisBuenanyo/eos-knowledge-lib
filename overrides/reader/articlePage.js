// Copyright 2014 Endless Mobile, Inc.

/* global private_imports */

const EosKnowledge = imports.gi.EosKnowledge;
const Gettext = imports.gettext;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ProgressLabel = private_imports.reader.progressLabel;
const TitleView = private_imports.reader.titleView;

const _TITLE_VIEW_LEFT_MARGIN_PX = 100;
const _CONTENT_VIEW_MARGIN_PX = 40;
const _DECORATIVE_BAR_HEIGHT = 19;

/**
 * Class: Reader.ArticlePage
 * The article page of the reader app.
 *
 * This page shows an article, title, attribution, and progress label.
 */
const ArticlePage = new Lang.Class({
    Name: 'ArticlePage',
    GTypeName: 'EknReaderArticlePage',
    Extends: Gtk.Frame,
    Properties: {
        /**
         * Property: title-view
         *
         * The <Reader.TitleView> widget created by this widget.
         * Read-only, modify using the title view API.
         */
        'title-view': GObject.ParamSpec.object('title-view', 'Title view',
            'The title view on the left-hand side of the page',
            GObject.ParamFlags.READABLE,
            TitleView.TitleView.$gtype),

        /**
         * Property: progress-label
         *
         * A widget showing where in the series of articles this article
         * resides. Is either a <Reader.ProgressLabel> widget or, in the
         * case of standalone pages a label saying that this article is
         * in the archive.
         */
        'progress-label': GObject.ParamSpec.object('progress-label', 'Progress Label',
            'The progress indicator at the top of the page',
            GObject.ParamFlags.READABLE | GObject.ParamFlags.WRITABLE,
            Gtk.Widget),
    },

    _init: function (props) {
        props = props || {};

        this.progress_label = props.progress_label || new ProgressLabel.ProgressLabel({
            vexpand: false,
            valign: Gtk.Align.CENTER,
        });
        this._title_view = new TitleView.TitleView({
            expand: true,
            valign: Gtk.Align.CENTER,
            margin_left: _TITLE_VIEW_LEFT_MARGIN_PX,
        });
        this._content_view = null;
        this.parent(props);

        let separator = new Gtk.Separator({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: true,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.FILL,
            margin: _CONTENT_VIEW_MARGIN_PX,
        });

        this._grid = new Gtk.Grid({
            // Keep a minimum width, or the labels get kinda illegible
            width_request: 600,
        });

        let decorative_frame = new Gtk.Frame({
            margin_left: _TITLE_VIEW_LEFT_MARGIN_PX,
            halign: Gtk.Align.START,
            height_request: _DECORATIVE_BAR_HEIGHT,
        });
        decorative_frame.get_style_context().add_class(EosKnowledge.STYLE_CLASS_READER_DECORATIVE_BAR);

        let decorative_title_size_group = new Gtk.SizeGroup({
            mode: Gtk.SizeGroupMode.HORIZONTAL,
        });

        decorative_title_size_group.add_widget(decorative_frame);
        decorative_title_size_group.add_widget(this._title_view);

        this._grid.attach(decorative_frame, 0, 0, 1, 1);
        this._grid.attach(this.progress_label, 0, 1, 3, 1);
        this._grid.attach(this._title_view, 0, 2, 1, 1);

        this._grid.attach(separator, 1, 2, 1, 1);

        this.add(this._grid);

        this._size_group = new Gtk.SizeGroup({
            mode: Gtk.SizeGroupMode.BOTH,
        });
        this._size_group.add_widget(this._title_view);

        this.get_style_context().add_class(EosKnowledge.STYLE_CLASS_ARTICLE_PAGE);
    },

    get title_view() {
        return this._title_view;
    },

    show_content_view: function (view) {
        if (this._content_view !== null) {
            this._grid.remove(this._content_view);
            this._size_group.remove_widget(this._content_view);
        }
        view.expand = true;
        view.margin_top = _CONTENT_VIEW_MARGIN_PX;
        this._content_view = view;
        this._grid.attach(view, 2, 2, 1, 1);
        this._size_group.add_widget(view);
        view.grab_focus();
        view.show_all();
    },

    clear_content: function () {
        if (this._content_view !== null) {
            this._content_view.destroy();
            this._content_view = null;
        }
    },
});
