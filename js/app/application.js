const Endless = imports.gi.Endless;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const Engine = imports.search.engine;
const LegacySearchProvider = imports.search.searchProvider;
const PresenterLoader = imports.app.presenterLoader;

const KnowledgeSearchIface = '\
<node> \
  <interface name="com.endlessm.KnowledgeSearch"> \
    <method name="LoadPage"> \
      <arg type="s" name="EknID" direction="in" /> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="u" name="Timestamp" direction="in" /> \
    </method> \
    <method name="LoadQuery"> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="u" name="Timestamp" direction="in" /> \
    </method> \
  </interface> \
</node>';

const Application = new Lang.Class({
    Name: 'Application',
    GTypeName: 'EknApplication',
    Extends: Endless.Application,

    _init: function (props={}) {
        this.parent(props);
        this._presenter = null;
        this._knowledge_search_impl = Gio.DBusExportedObject.wrapJSObject(KnowledgeSearchIface, this);

        let domain = this.application_id.split('.').pop();
        Engine.Engine.get_default().default_domain = domain;

        // HACK for legacy compatibility: if the user has an old bundle with
        // a new eos-knowledge-lib, their search-provider ini files will have
        // the application ID rather than ekn-search-provider. Export an old
        // search provider for them.
        this._legacy_search_provider =
            new LegacySearchProvider.AppSearchProvider({ domain: domain });
    },

    vfunc_dbus_register: function (connection, path) {
        this.parent(connection, path);
        this._knowledge_search_impl.export(connection, path);
        this._legacy_search_provider.skeleton.export(connection, path);
        return true;
    },

    vfunc_dbus_unregister: function (connection, path) {
        this.parent(connection, path);
        this._knowledge_search_impl.unexport_from_connection(connection);
        this._legacy_search_provider.skeleton.unexport_from_connection(connection);
    },

    LoadPage: function (ekn_id, query, timestamp) {
        this.ensure_presenter();
        this._presenter.activate_search_result(timestamp, ekn_id, query);
    },

    LoadQuery: function (query, timestamp) {
        this.ensure_presenter();
        this._presenter.search(timestamp, query);
    },

    vfunc_activate: function () {
        this.parent();
        this.ensure_presenter();
        this._presenter.desktop_launch(Gdk.CURRENT_TIME);
    },

    vfunc_window_removed: function (win) {
        if (this._presenter && this._presenter.view === win) {
            this._presenter = null;
        }
        this.parent(win);
    },

    // To be overridden in subclass
    ensure_presenter: function () {
        if (this._presenter === null)
            this._presenter = PresenterLoader.setup_presenter_for_resource(this, ARGV[1]);
    },
});
