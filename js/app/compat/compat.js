const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

const ContentObjectModel = imports.search.contentObjectModel;
const Engine = imports.search.engine;
const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;

function transform_v1_description(json) {
    let modules = {};

    switch (json.templateType) {
    case 'A':
        modules['app-banner'] = {
            type: 'AppBanner',
            properties: {
                'image-uri': json['titleImageURI'],
                'min-fraction': 0.4,
                'max-fraction': 0.7,
            },
        };
        modules['top-bar-search'] = {
            type: 'SearchBox',
        };
        modules['home-search'] = {
            type: 'SearchBox',
        };
        modules['home-card'] = {
            type: 'CardA',
        };
        modules['results-title-card'] = {
            type: 'SetBannerCard',
        };
        modules['results-search-banner'] = {
            type: 'SearchBanner',
        };
        modules['results-card'] = {
            type: 'CardA',
        };
        modules['lightbox-card'] = {
            type: 'MediaCard',
        };
        modules['document-card'] = {
            type: 'DocumentCard',
        };
        break;
    case 'B':
        modules['app-banner'] = {
            type: 'AppBanner',
            properties: {
                'image-uri': json['titleImageURI'],
                'min-fraction': 0.4,
                'max-fraction': 0.7,
                'visible': true,
                'can-focus': false,
            },
        };
        modules['card-container'] = {
            type: 'CardContainer',
            properties: {
                'expand': true,
                'halign': Gtk.Align.FILL,
                'valign': Gtk.Align.FILL,
            },
        };
        modules['home-page-template'] = {
            type: 'HomePageBTemplate',
            slots: {
                top_left: "app-banner",
                top_right: "home-search",
                bottom: "card-container",
            }
        };
        modules['top-bar-search'] = {
            type: 'SearchBox',
        };
        modules['home-search'] = {
            type: 'SearchBox',
            properties: {
                'width_request': 350,
                'visible': true,
                'can_focus': false,
                'shadow_type': Gtk.ShadowType.NONE,
                'halign': Gtk.Align.CENTER,
                'valign': Gtk.Align.CENTER,
            }
        };
        modules['home-card'] = {
            type: 'CardB',
        };
        modules['results-title-card'] = {
            type: 'SetBannerCard',
        };
        modules['results-search-banner'] = {
            type: 'SearchBanner',
        };
        modules['results-arrangement'] = {
            type: 'ListArrangement',
        };
        modules['results-card'] = {
            type: 'TextCard',
        };
        modules['lightbox-card'] = {
            type: 'MediaCard',
        };
        modules['document-card'] = {
            type: 'DocumentCard',
        };
        break;
    case 'encyclopedia':
        modules['app-banner'] = {
            type: 'AppBanner',
            properties: {
                'image-uri': json['titleImageURI'],
                'min-fraction': 0.5,
                'max-fraction': 0.5,
                'margin-bottom': 42,
            },
        };
        modules['home-search'] = {
            type: 'SearchBox',
            properties: {
                'max-width-chars': 52,
            }
        };
        modules['article-app-banner'] = {
            type: 'AppBanner',
            properties: {
                'image-uri': json['titleImageURI'],
                'min-fraction': 0.2,
                'max-fraction': 0.2,
                'margin-top': 10,
                'margin-bottom': 10,
            },
        };
        modules['lightbox-card'] = {
            type: 'MediaCard',
        };
        modules['document-card'] = {
            type: 'DocumentCard',
            properties: {
                'expand': true,
            },
        };
        modules['search-results'] = {
            type: 'SearchModule',
        };
        modules['results-card'] = {
            type: 'TextCard',
            properties: {
                'underline-on-hover': true,
                'decoration': true,
            },
        };
        // FIXME: this should be a submodule of search-results, in the
        // "arrangement" slot, when we get submodules implemented in the factory
        modules['results-arrangement'] = {
            type: 'ListArrangement',
        };
        break;
    case 'reader':
        modules['app-banner'] = {
            type: 'AppBanner',
            properties: {
                'image-uri': json['titleImageURI'],
            },
        };
        modules['top-bar-search'] = {
            type: 'SearchBox',
        };
        modules['home-card'] = {
            type: 'ArticleSnippetCard',
        };
        modules['lightbox-card'] = {
            type: 'MediaCard',
        };
        modules['results-card'] = {
            type: 'ReaderCard',
            properties: {
                'title-capitalization': EosKnowledgePrivate.TextTransform.UPPERCASE,
            },
        };
        break;
    default:
        throw new Error('Unrecognized v1 preset type: ' + json.templateType);
    }

    return { 'modules': modules };
}

function create_v1_set_models(json, engine) {
    if (!json.hasOwnProperty('sections'))
        return;

    let sections = json['sections'];
    delete json['sections'];
    sections.forEach((section) => {
        if (!section.hasOwnProperty('thumbnailURI'))
            log("WARNING: Missing category thumbnail for " + section['title']);

        let domain = engine.default_domain;
        let sha = GLib.compute_checksum_for_string(GLib.ChecksumType.SHA1,
            'category' + domain + section['title'], -1);
        let id = 'ekn://' + domain + '/' + sha;
        let tags = section['tags'].slice();
        tags.push(Engine.HOME_PAGE_TAG);

        let model = new ContentObjectModel.ContentObjectModel({
            ekn_id: id,
            title: section['title'],
            thumbnail_uri: section['thumbnailURI'],
            featured: !!section['featured'],
            tags: tags,
        });
        engine.add_runtime_object(id, model);
    });
}
