// Copyright 2016 Endless Mobile, Inc.

/* exported NoResultsMessage */

const Gettext = imports.gettext;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Config = imports.app.config;
const Module = imports.app.interfaces.module;

let _ = Gettext.dgettext.bind(null, Config.GETTEXT_PACKAGE);

/**
 * Class: NoResultsMessage
 * NoResultsMessage results module
 *
 * This is a simple, static text module for displaying an error page
 * in the case that a user's query returned no results or failed with
 * an error. Should be used in the 'no-results' slot of
 * <ContentGroup.ContentGroup>.
 */
const NoResultsMessage = new Module.Class({
    Name: 'ContentGroup.NoResultsMessage',
    Extends: Gtk.Grid,

    Properties: {
        /**
         * Property: justify
         * Horizontal justification of message text
         *
         * Default value:
         *   **Gtk.Justification.LEFT**
         */
        'justify': GObject.ParamSpec.enum('justify',
            'Justify', 'Horizontal justification of message text',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            Gtk.Justification.$gtype, Gtk.Justification.LEFT),
    },

    Template: 'resource:///com/endlessm/knowledge/data/widgets/contentGroup/noResultsMessage.ui',
    InternalChildren: [ 'message-subtitle', 'message-title' ],

    _init: function (props={}) {
        this.parent(props);

        this._message_title.justify = this._message_subtitle.justify = this.justify;
        this._message_title.halign = this._message_subtitle.halign = this.halign;
        // Set this in code rather than in the UI template, in order to avoid
        // including the Pango markup in the translatable string
        this._message_title.label = "<span weight=\"bold\" size=\"x-large\">" +
            _("Sorry! :-(") + "</span>\n\n" +
            _("There are no results that match your search.\n");
    },
});
