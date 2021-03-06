const Eknc = imports.gi.EosKnowledgeContent;

describe('QueryObject', function () {
    it('sets tags and ids objects properly', function () {
        let ids = ['ekn://busters-es/0123456789012345',
                   'ekn://busters-es/fabaffacabacbafa'];
        let tags = ['Venkman', 'Stantz'];
        let query_obj = Eknc.QueryObject.new_from_props({
            ids: ids,
            tags_match_any: tags,
        });
        expect(ids).toEqual(query_obj.ids);
        expect(tags).toEqual(query_obj.tags_match_any);
    });

    it('makes a deep copy of arrays passed into it', function () {
        let ids = ['ekn://busters-es/0123456789012345',
                   'ekn://busters-es/fabaffacabacbafa'];
        let tags = ['Venkman', 'Stantz'];
        let query_obj = Eknc.QueryObject.new_from_props({
            ids: ids,
            tags_match_any: tags,
        });
        ids = ids.concat(['ekn://busters-es/0123456789abcdef']);
        delete tags[1];
        expect(query_obj.ids).not.toEqual(ids);
        expect(query_obj.tags_match_any).not.toEqual(tags);
    });

    describe('new_from_object constructor', function () {
        it('duplicates properties from source object', function () {
            let tags = ['Venkman', 'Stantz'];
            let query = 'keymaster';
            let query_obj = Eknc.QueryObject.new_from_props({
                tags_match_any: tags,
                query: query,
            });
            let query_obj_copy = Eknc.QueryObject.new_from_object(query_obj);
            expect(query_obj_copy.tags_match_any).toEqual(tags);
            expect(query_obj_copy.query).toEqual(query);
        });

        it('allows properties to be overridden', function () {
            let tags = ['Venkman', 'Stantz'];
            let query = 'keymaster';
            let query_obj = Eknc.QueryObject.new_from_props({
                tags_match_any: tags,
                query: query,
            });
            let new_query = 'gatekeeper';
            let new_query_object = Eknc.QueryObject.new_from_object(query_obj, {
                query: new_query
            });
            expect(new_query_object.tags_match_any).toEqual(tags);
            expect(new_query_object.query).toEqual(new_query);
        });
    });

    it('should map sort property to xapian sort value', function () {
        let query_obj = Eknc.QueryObject.new_from_props({
            query: 'tyrion wins',
            sort: Eknc.QueryObjectSort.SEQUENCE_NUMBER,
        });
        let result = query_obj.get_sort_value(query_obj);
        expect(result).toBe(0);

        query_obj = Eknc.QueryObject.new_from_props({
            query: 'tyrion wins',
        });
        let undefined_result = query_obj.get_sort_value(query_obj);
        expect(undefined_result).toBe(-1);
    });

    it('should map match type to xapian cutoff value', () => {
        let query_obj = Eknc.QueryObject.new_from_props({
            query: 'tyrion wins',
            match: Eknc.QueryObjectMatch.TITLE_SYNOPSIS,
        });
        let result = query_obj.get_cutoff(query_obj);
        expect(result).toBe(20);

        query_obj = Eknc.QueryObject.new_from_props({
            query: 'tyrion wins',
            match: Eknc.QueryObjectMatch.ONLY_TITLE,
        });
        result = query_obj.get_cutoff(query_obj);
        expect(result).toBe(10);
    });

    describe('query parser string', () => {
        it('contains expected terms', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'foo bar baz',
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('exact_title:Foo_Bar_Baz');
            expect(result).toMatch('title:foo');
            expect(result).toMatch('title:bar');
            expect(result).toMatch('title:baz');
        });

        it('creates title clause based on the stop-free-query if provided', () => {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'foo bar baz',
                stopword_free_query: 'oof rab zab',
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('exact_title:Foo_Bar_Baz');
            expect(result).toMatch('title:oof');
            expect(result).toMatch('title:rab');
            expect(result).toMatch('title:zab');

            expect(result).not.toMatch('title:foo');
            expect(result).not.toMatch('title:bar');
            expect(result).not.toMatch('title:baz');
        });

        it('adds wildcard terms only for incremental search', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'foo',
                mode: Eknc.QueryObjectMode.INCREMENTAL,
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('exact_title:Foo\\*');
            expect(result).toMatch('title:foo\\*');

            query_obj = Eknc.QueryObject.new_from_props({
                query: 'foo',
                mode: Eknc.QueryObjectMode.DELIMITED,
            });
            result = query_obj.get_query_parser_string(query_obj);
            expect(result).not.toMatch('exact_title:Foo\\*');
            expect(result).not.toMatch('title:foo\\*');
        });

        it('contains terms without title prefix if matching synopsis', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'littl searc',
                match: Eknc.QueryObjectMatch.TITLE_SYNOPSIS,
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch(/\(littl OR littl\*\) AND \(searc OR searc\*\)/);
        });

        it('uses stopword free terms if matching synopsis', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'littl searc',
                stopword_free_query: 'no stopwords',
                match: Eknc.QueryObjectMatch.TITLE_SYNOPSIS,
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch(/\(no OR no\*\) AND \(stopwords OR stopwords\*\)/);
            expect(result).not.toMatch(/\(littl OR littl\*\) AND \(searc OR searc\*\)/);
        });

        it('only uses exact title search for single character queries', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'a',
                mode: Eknc.QueryObjectMode.INCREMENTAL,
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('exact_title:A');
            expect(result).not.toMatch('a\\*');
            expect(result).not.toMatch('title:a');
        });

        it('should ignore excess whitespace (except for tags)', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'whoa      man',
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('exact_title:Whoa_Man');
            expect(result).toMatch('title:whoa');
            expect(result).toMatch('title:man');
        });

        it('should treat semi colons as whitespace', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'whoa;man',
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('exact_title:Whoa_Man');
            expect(result).toMatch('title:whoa');
            expect(result).toMatch('title:man');
        });

        it('should lowercase xapian operator terms', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'PENN AND tELLER',
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('title:and');
        });

        it('should remove parentheses in user terms', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'foo (bar) baz ((',
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('exact_title:Foo_Bar_Baz');
        });

        it('contains ids from query object', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                app_id: 'app-id',
                ids: ['ekn://domain/0123456789abcdef',
                      'ekn://domain/fedcba9876543210'],
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('id:0123456789abcdef OR id:fedcba9876543210');
        });

        it('contains tags from query object', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                tags_match_any: ['cats', 'dogs', 'turtles'],
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('tag:"cats" OR tag:"dogs" OR tag:"turtles"');
        });

        it('joins tags with AND for tag-match all', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                tags_match_all: ['cats', 'dogs', 'turtles'],
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('tag:"cats" AND tag:"dogs" AND tag:"turtles"');
        });

        it('should surround multiword tags in quotes', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                tags_match_any: ['cat zombies'],
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('tag:"cat zombies"');
        });

        it('filters unwanted tags and ids', function () {
            let query_obj = Eknc.QueryObject.new_from_props({
                query: 'tyrion wins',
                excluded_ids: [
                    'ekn://fake-domain/cleganebowlfever',
                    'ekn://fake-domain/errybodygethyped'
                ],
                excluded_tags: ['chicken', 'shop'],
            });
            let result = query_obj.get_query_parser_string(query_obj);
            expect(result).toMatch('NOT id:cleganebowlfever');
            expect(result).toMatch('NOT id:errybodygethyped');
            expect(result).toMatch('NOT tag:"chicken"');
            expect(result).toMatch('NOT tag:"shop"');
        });

        it('should handle large queries', function () {
            let long_query = 'q'.repeat(300);
            let query_obj = Eknc.QueryObject.new_from_props({
                query: long_query,
            });
            let result = query_obj.get_query_parser_string(query_obj);
            let limited_result = 'exact_title:Q' + 'q'.repeat(244);
            expect(result).toMatch(limited_result)
            // 245 is the term limit so adding an extra letter should not match
            let too_big_result = limited_result + 'q';
            expect(result).not.toMatch(too_big_result)
        });

        it('should handle large queries with non-ASCII characters', function () {
            let long_query = 'ç'.repeat(300);
            let query_obj = Eknc.QueryObject.new_from_props({
                query: long_query,
            });
            let result = query_obj.get_query_parser_string(query_obj);
            // Each ç is two bytes so we can only fit half as many. Then since
            // 245 is an odd number, this will leave us with a byte sequence
            // that does not correspond to a full character sequence so we
            // must remove one more byte.
            let limited_result = 'exact_title:Ç' + 'ç'.repeat((244/2) - 1);
            expect(result).toMatch(limited_result)
            // 245 is the term limit so adding an extra letter should not match
            let too_big_result = limited_result + 'ç';
            expect(result).not.toMatch(too_big_result)
        });

        describe('id checking code', function () {
            it('validates a simple EKN ID', function () {
                let query_obj = Eknc.QueryObject.new_from_props({
                    app_id: 'com.endlessm.travel-es',
                    ids: ['ekn://travel-es/2e11617b6bce1e6d'],
                });
                let result = query_obj.get_query_parser_string(query_obj);
                expect(result).toMatch('2e11617b6bce1e6d');
            });

            it('validates an EKN ID with uppercase hex digits', function () {
                let query_obj = Eknc.QueryObject.new_from_props({
                    app_id: 'com.endlessm.travel-es',
                    ids: ['ekn://travel-es/2E11617B6BCE1E6D'],
                });
                let result = query_obj.get_query_parser_string(query_obj);
                expect(result).toMatch('2E11617B6BCE1E6D');
            });

            it('rejects an EKN ID with an invalid hash', function () {
                let query_obj = Eknc.QueryObject.new_from_props({
                    app_id: 'com.endlessm.bad1',
                    ids: ['ekn://bad1/someha$h'],
                });
                let result = query_obj.get_query_parser_string(query_obj);
                expect(result).not.toMatch('id:');
            });

            it('rejects an EKN ID with the wrong URI scheme', function () {
                let query_obj = Eknc.QueryObject.new_from_props({
                    app_id: 'com.endlessm.bad1',
                    ids: ['bad1/2e11617b6bce1e6d'],
                });
                let result = query_obj.get_query_parser_string(query_obj);
                expect(result).not.toMatch('id:');
            });

            it('rejects an EKN ID with no hash', function () {
                let query_obj = Eknc.QueryObject.new_from_props({
                    app_id: 'com.endlessm.scuba-diving-es',
                    ids: ['ekn://scuba-diving-es'],
                });
                let result = query_obj.get_query_parser_string(query_obj);
                expect(result).not.toMatch('id:');
            });

            it('rejects an EKN ID with too many parts', function () {
                let query_obj = Eknc.QueryObject.new_from_props({
                    app_id: 'ccom.endlessm.travel-es',
                    ids: ['ekn://travel-es/2e11617b6bce1e6d/too/many/parts'],
                });
                let result = query_obj.get_query_parser_string(query_obj);
                expect(result).not.toMatch('id:');
            });
        });
    });
});
