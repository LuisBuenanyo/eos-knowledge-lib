/* exported SubsetsForSet */

// Copyright 2016 Endless Mobile, Inc.

const HistoryStore = imports.app.historyStore;
const Module = imports.app.interfaces.module;
const QueryObject = imports.search.queryObject;
const SetObjectModel = imports.search.setObjectModel;
const Xapian = imports.app.modules.selection.xapian;

const SubsetsForSet = new Module.Class({
    Name: 'SubsetsForSetSelection',
    Extends: Xapian.Xapian,

    _init: function (props) {
        this.parent(props);

        if (this.global) {
            let item = HistoryStore.get_default().get_current_item();
            if (item && item.model instanceof SetObjectModel.SetObjectModel)
                this.model = item.model;
            HistoryStore.get_default().connect('changed',
                this._on_history_changed_global.bind(this));
        }
    },

    _on_history_changed_global: function () {
        let item = HistoryStore.get_default().get_current_item();
        if (item.model instanceof SetObjectModel.SetObjectModel &&
            item.model !== this.model) {
            this.clear();
            this.model = item.model;
        }
    },

    construct_query_object: function (limit) {
        if (!this.model)
            throw new Error('You should not be loading this selection unless on the set page');

        return new QueryObject.QueryObject({
            limit: limit,
            tags_match_any: this.model.child_tags,
            tags_match_all: ['EknSetObject'],
        });
    },
});