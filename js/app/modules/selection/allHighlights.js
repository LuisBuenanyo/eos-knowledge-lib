/* exported AllHighlights */

// Copyright 2016 Endless Mobile, Inc.

const Eknc = imports.gi.EosKnowledgeContent;
const GLib = imports.gi.GLib;

const Module = imports.app.interfaces.module;
const Xapian = imports.app.modules.selection.xapian;

const AllHighlights = new Module.Class({
    Name: 'Selection.AllHighlights',
    Extends: Xapian.Xapian,

    _init: function (props={}) {
        this.parent(props);
        this._set_needs_refresh(true);
    },

    construct_query_object: function (limit, query_index) {
        if (query_index == 0) {
            return Eknc.QueryObject.new_from_props({
                limit: limit,
                tags_match_all: ['EknArticleObject', 'EknFeaturedTag'],
                excluded_tags: [],
            });
        } else if (query_index == 1) {
            return Eknc.QueryObject.new_from_props({
                limit: limit,
                tags_match_all: ['EknArticleObject'],
                excluded_tags: ['EknFeaturedTag'],
            });
        }

        // All other indexes (>= 2) should return null
        return null;
    },
});
