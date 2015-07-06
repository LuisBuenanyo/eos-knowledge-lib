// Copyright 2015 Endless Mobile, Inc.

const Lang = imports.lang;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const MinimalModule = imports.tests.minimalModule;

const MockFactory = new Lang.Class({
    Name: 'MockFactory',
    Extends: GObject.Object,

    _init: function (props={}) {
        this.parent();
    },
});

describe('Module interface', function () {
    let module;

    beforeEach(function () {
        let mock_factory = new MockFactory();

        module = new MinimalModule.MinimalModule({
            factory: mock_factory,
        });
    });

    it ('Constructs', function () {});
});