// Copyright 2014 Endless Mobile, Inc.

const Endless = imports.gi.Endless;
const EosKnowledge = imports.gi.EosKnowledge;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ContentObjectModel = imports.contentObjectModel;

GObject.ParamFlags.READWRITE = GObject.ParamFlags.READABLE | GObject.ParamFlags.WRITABLE;

/**
 * Class: ArticleObjectModel
 * The model class for article objects. An article has the same 
 * properties as a <ContentObjectModel>, plus a <article-content-uri>,
 * <word-count>, and <table-of-contents>.
 */
const ArticleObjectModel = new Lang.Class({
    Name: 'ArticleObjectModel',
    GTypeName: 'EknArticleObjectModel',
    Extends: ContentObjectModel.ContentObjectModel,
    Properties: {
        /**
         * Property: word-count
         * Integer indicating how many words are in the article
         */
        'word-count': GObject.ParamSpec.uint('word-count', 'Word Count',
            'Number of words contained in the article body',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT,
            0, GLib.MAXUINT32, 0),

        /**
         * Property: table-of-contents
         * A GtkTreeStore representing the article's hierarchical
         * table of contents
         */
        'table-of-contents': GObject.ParamSpec.object('table-of-contents',
             'Table of Contents',
             'Tree representing the article\'s table of contents',
             GObject.ParamFlags.READWRITE,
             Gtk.TreeStore),
    },
    
    _init: function (params) {
        this.parent(params);
    },

    get word_count () {
        return this._word_count;
    },

    get table_of_contents () {
        return this._table_of_contents;
    },

    set word_count (v) {
        this._word_count = v;
    },

    set table_of_contents (v) {
        this._table_of_contents = v;
    }
});

/**
 * Constructor: new_from_json_ld
 * Creates an ArticleObjectModel from a Knowledge Engine ArticleObject
 * JSON-LD document
 */
ArticleObjectModel.new_from_json_ld = function (json_ld_data) {
    let props = ArticleObjectModel._props_from_json_ld(json_ld_data);
    let article_object_model = new ArticleObjectModel(props);
    ArticleObjectModel._setup_from_json_ld(article_object_model, json_ld_data);

    return article_object_model;
};

ArticleObjectModel._setup_from_json_ld = function (model, json_ld_data) {
    // Inherit setup from parent class
    let ParentClass = ArticleObjectModel.__super__;
    ParentClass._setup_from_json_ld(model, json_ld_data);
};

ArticleObjectModel._props_from_json_ld = function (json_ld_data) {
    // Inherit properties marshalled from parent class
    let ParentClass = ArticleObjectModel.__super__;
    let props = ParentClass._props_from_json_ld(json_ld_data);

    // Marshal properties specific to ArticleObjectModel
    if (json_ld_data.hasOwnProperty('wordCount')) {
        props.word_count = parseInt(json_ld_data.wordCount);
    }

    if (json_ld_data.hasOwnProperty('tableOfContents')) {
        props.table_of_contents = EosKnowledge.tree_model_from_tree_node(json_ld_data);
    }

    return props;
};
