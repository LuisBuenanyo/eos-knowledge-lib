// Copyright 2016 Endless Mobile, Inc.
const Lang = imports.lang;
const Gio = imports.gi.Gio;

const AsyncTask = imports.search.asyncTask;

// Returns items that are in A but not in B.
function subtract_set (A, B, key) {
    let result = [];
    let mapped_A = A.map(key);
    let mapped_B = B.map(key);

    for (let i = 0; i < mapped_A.length; i++) {
        let item = mapped_A[i];
        if (mapped_B.indexOf(item) === -1)
            result.push(A[i]);
    }
    return result;
}


const BaseDownloader = new Lang.Class({
    Name: 'BaseDownloader',

    _init: function (app) {
        this._app = app;
    },

    apply_update: function (subscription_id, cancellable, callback) {
        let task = new AsyncTask.AsyncTask(this, cancellable, callback);

        task.catch_errors(() => {
            this._app.hold();

            let directory = this._subscriptions_dir.get_child(subscription_id);
            if (!directory.query_exists(cancellable))
                return task.return_value(false);

            let new_manifest_file = directory.get_child('manifest.json.new');
            let new_manifest = this._load_manifest(new_manifest_file, cancellable);
            // If we don't have a new manifest, we don't have an update.
            if (new_manifest === null)
                return task.return_value(false);

            let manifest_file = directory.get_child('manifest.json');
            let old_manifest = this._load_manifest(manifest_file, cancellable);
            if (old_manifest === null)
                old_manifest = { shards: [] };

            // Make sure we have all shards before we can apply the update.
            let new_shards = new_manifest.shards;
            let have_all_shards = new_shards.every((shard) => {
                let shard_file = directory.get_child(shard.path);
                return shard_file.query_exists(cancellable);
            });

            if (!have_all_shards)
                return task.return_value(false);

            // OK, we're ready to go and can apply the update. Move our new manifest,
            // and then clean up the old shards.
            new_manifest_file.move(manifest_file, Gio.FileCopyFlags.OVERWRITE, cancellable, null);

            let old_shards = old_manifest.shards;
            let new_shards = new_manifest.shards;
            let to_delete = subtract_set(old_shards, new_shards, (shard) => shard.path);

            to_delete.forEach((shard) => {
                let shard_file = directory.get_child(shard.path);
                shard_file.delete(cancellable);
            });

            return task.return_value(true);
        });

        return task;
    },

    apply_update_finish: function (task) {
        this._app.release();
        return task.finish();
    },

    _load_manifest: function (file, cancellable) {
        try {
            let [success, data] = file.load_contents(cancellable);
            return JSON.parse(data);
        } catch (e if e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
            return null;
        }
    }
})

return BaseDownloader;
