
angular.module('egCoreMod')
// toss tihs onto egCoreMod since the page app may vary

.factory('patronRegSvc', ['$q', 'egCore', function($q, egCore) {

    var service = {
        field_doc : {},             // config.idl_field_doc
        profiles : [],              // permission groups
        sms_carriers : [],
        user_settings : {},         // applied user settings
        user_setting_types : {},    // config.usr_setting_type
        modified_user_settings : {} // settings modifed this session
    };

    // launch a series of parallel data retrieval calls
    service.init = function(scope) {
        return $q.all([
            service.get_field_doc(),
            service.get_perm_groups(),
            service.get_ident_types(),
            service.get_user_settings(),
            service.get_org_settings(),
            service.get_stat_cats(),
            service.get_surveys(),
            service.get_net_access_levels()
        ]);
    };

    service.get_surveys = function() {
        var org_ids = egCore.org.ancestors(egCore.auth.user().ws_ou(), true);

        return egCore.pcrud.search('asv', 
            {owner : org_ids}, 
            {flesh : 1, flesh_fields : {asv : ['questions']}}, 
            {atomic : true}
        ).then(function(surveys) {
            service.surveys = surveys;
        });
    }

    service.get_stat_cats = function() {
        return egCore.net.request(
            'open-ils.circ',
            'open-ils.circ.stat_cat.actor.retrieve.all',
            egCore.auth.token(), egCore.auth.user().ws_ou()
        ).then(function(cats) {
            service.stat_cats = cats;
        });
    };

    service.get_org_settings = function() {
        return egCore.org.settings([
            'global.password_regex',
            'global.juvenile_age_threshold',
            'patron.password.use_phone',
            'ui.patron.default_inet_access_level',
            'ui.patron.default_ident_type',
            'ui.patron.default_country',
            'ui.patron.registration.require_address',
            'circ.holds.behind_desk_pickup_supported',
            'circ.patron_edit.clone.copy_address',
            'ui.patron.edit.au.prefix.require',
            'ui.patron.edit.au.prefix.show',
            'ui.patron.edit.au.prefix.suggest',
            'ui.patron.edit.ac.barcode.regex',
            'ui.patron.edit.au.second_given_name.show',
            'ui.patron.edit.au.second_given_name.suggest',
            'ui.patron.edit.au.suffix.show',
            'ui.patron.edit.au.suffix.suggest',
            'ui.patron.edit.au.alias.show',
            'ui.patron.edit.au.alias.suggest',
            'ui.patron.edit.au.dob.require',
            'ui.patron.edit.au.dob.show',
            'ui.patron.edit.au.dob.suggest',
            'ui.patron.edit.au.dob.calendar',
            'ui.patron.edit.au.juvenile.show',
            'ui.patron.edit.au.juvenile.suggest',
            'ui.patron.edit.au.ident_value.show',
            'ui.patron.edit.au.ident_value.suggest',
            'ui.patron.edit.au.ident_value2.show',
            'ui.patron.edit.au.ident_value2.suggest',
            'ui.patron.edit.au.email.require',
            'ui.patron.edit.au.email.show',
            'ui.patron.edit.au.email.suggest',
            'ui.patron.edit.au.email.regex',
            'ui.patron.edit.au.email.example',
            'ui.patron.edit.au.day_phone.require',
            'ui.patron.edit.au.day_phone.show',
            'ui.patron.edit.au.day_phone.suggest',
            'ui.patron.edit.au.day_phone.regex',
            'ui.patron.edit.au.day_phone.example',
            'ui.patron.edit.au.evening_phone.require',
            'ui.patron.edit.au.evening_phone.show',
            'ui.patron.edit.au.evening_phone.suggest',
            'ui.patron.edit.au.evening_phone.regex',
            'ui.patron.edit.au.evening_phone.example',
            'ui.patron.edit.au.other_phone.require',
            'ui.patron.edit.au.other_phone.show',
            'ui.patron.edit.au.other_phone.suggest',
            'ui.patron.edit.au.other_phone.regex',
            'ui.patron.edit.au.other_phone.example',
            'ui.patron.edit.phone.regex',
            'ui.patron.edit.phone.example',
            'ui.patron.edit.au.active.show',
            'ui.patron.edit.au.active.suggest',
            'ui.patron.edit.au.barred.show',
            'ui.patron.edit.au.barred.suggest',
            'ui.patron.edit.au.master_account.show',
            'ui.patron.edit.au.master_account.suggest',
            'ui.patron.edit.au.claims_returned_count.show',
            'ui.patron.edit.au.claims_returned_count.suggest',
            'ui.patron.edit.au.claims_never_checked_out_count.show',
            'ui.patron.edit.au.claims_never_checked_out_count.suggest',
            'ui.patron.edit.au.alert_message.show',
            'ui.patron.edit.au.alert_message.suggest',
            'ui.patron.edit.aua.post_code.regex',
            'ui.patron.edit.aua.post_code.example',
            'ui.patron.edit.aua.county.require',
            'format.date',
            'ui.patron.edit.default_suggested',
            'opac.barcode_regex',
            'opac.username_regex',
            'sms.enable',
            'ui.patron.edit.aua.state.require',
            'ui.patron.edit.aua.state.suggest',
            'ui.patron.edit.aua.state.show'
        ]).then(function(settings) {
            service.org_settings = settings;
            return service.process_org_settings(settings);
        });
    };

    // some org settings require the retrieval of additional data
    service.process_org_settings = function(settings) {

        var promises = [];

        if (settings['sms.enable']) {
            // fetch SMS carriers
            promises.push(
                egCore.pcrud.search('csc', 
                    {active: 'true'}, 
                    {'order_by':[
                        {'class':'csc', 'field':'name'},
                        {'class':'csc', 'field':'region'}
                    ]}, {atomic : true}
                ).then(function(carriers) {
                    service.sms_carriers = carriers;
                })
            );
        } else {
            // if other promises are added below, this is not necessary.
            promises.push($q.when());  
        }

        // other post-org-settings processing goes here,
        // adding to promises as needed.

        return $q.all(promises);
    };

    service.get_ident_types = function() {
        return egCore.pcrud.retrieveAll('cit', {}, {atomic : true})
        .then(function(types) { service.ident_types = types });
    };

    service.get_net_access_levels = function() {
        return egCore.pcrud.retrieveAll('cnal', {}, {atomic : true})
        .then(function(levels) { service.net_access_levels = levels });
    }

    service.get_perm_groups = function() {
        if (egCore.env.pgt) {
            service.profiles = egCore.env.pgt.list;
            return $q.when();
        } else {
            return egCore.pcrud.search('pgt', {parent : null}, 
                {flesh : -1, flesh_fields : {pgt : ['children']}}
            ).then(
                function(tree) {
                    egCore.env.absorbTree(tree, 'pgt')
                    service.profiles = egCore.env.pgt.list;
                }
            );
        }
    }

    service.get_field_doc = function() {

        return egCore.pcrud.search('fdoc', {
            fm_class: ['au', 'ac', 'aua', 'actsc', 'asv', 'asvq', 'asva']})
        .then(null, null, function(doc) {
            if (!service.field_doc[doc.fm_class()]) {
                service.field_doc[doc.fm_class()] = {};
            }
            service.field_doc[doc.fm_class()][doc.field()] = doc;
        });
    };

    service.get_user_settings = function() {
        var org_ids = egCore.org.ancestors(egCore.auth.user().ws_ou(), true);

        return egCore.pcrud.search('cust', {
            '-or' : [
                {name : [ // common user settings
                    'circ.holds_behind_desk', 
                    'circ.collections.exempt', 
                    'opac.hold_notify', 
                    'opac.default_phone', 
                    'opac.default_pickup_location', 
                    'opac.default_sms_carrier', 
                    'opac.default_sms_notify']}, 
                {name : { // opt-in notification user settings
                    'in': {
                        select : {atevdef : ['opt_in_setting']}, 
                        from : 'atevdef',
                        // we only care about opt-in settings for 
                        // event_defs our users encounter
                        where : {'+atevdef' : {owner : org_ids}}
                    }
                }}
            ]
        }, {}, {atomic : true}).then(function(setting_types) {

            angular.forEach(setting_types, function(stype) {
                service.user_setting_types[stype.name()] = stype;
            });

            if(service.patron_id) {
                // retrieve applied values for the current user 
                // for the setting types we care about.

                var setting_names = 
                    setting_types.map(function(obj) { return obj.name() });

                return egCore.net.request(
                    'open-ils.actor', 
                    'open-ils.actor.patron.settings.retrieve.authoritative',
                    egCore.auth.token(),
                    service.patron_id,
                    setting_names
                ).then(function(settings) {
                    service.user_settings = settings;
                });
            }

            // apply default user setting values
            angular.forEach(setting_types, function(stype, index) {
                if (stype.reg_default() != undefined) {
                    service.modified_user_settings[setting.name()] = 
                        service.user_settings[setting.name()] = 
                        setting.reg_default();
                }
            });
        });
    }

    service.init_patron = function(current) {

        if (!current)
            return service.init_new_patron();

        service.patron = current;
        return service.init_existing_patron(current)
    }

    service.ingest_address = function(patron, addr) {
        addr.valid = addr.valid == 't';
        addr.within_city_limits = addr.within_city_limits == 't';
        addr._is_mailing = (patron.mailing_address && 
            addr.id == patron.mailing_address.id);
        addr._is_billing = (patron.billing_address && 
            addr.id == patron.billing_address.id);
    }

    /*
     * Existing patron objects reqire some data munging before insertion
     * into the scope.
     *
     * 1. Turn everything into a hash
     * 2. ... Except certain fields (selectors) whose widgets require objects
     * 3. Bools must be Boolean, not t/f.
     */
    service.init_existing_patron = function(current) {

        var patron = egCore.idl.toHash(current);

        patron.home_ou = egCore.org.get(patron.home_ou.id);
        patron.expire_date = new Date(Date.parse(patron.expire_date));
        patron.dob = new Date(Date.parse(patron.dob));
        patron.profile = current.profile(); // pre-hash version
        patron.net_access_level = current.net_access_level();
        patron.ident_type = current.ident_type();

        angular.forEach(
            ['juvenile', 'barred', 'active', 'master_account'],
            function(field) { patron[field] = patron[field] == 't'; }
        );

        angular.forEach(patron.cards, function(card) {
            card.active = card.active == 't'
            if (card.id == patron.card.id)
                card._primary = 'on';
        });

        angular.forEach(patron.addresses, 
            function(addr) { service.ingest_address(patron, addr) });

        return patron;
    }

    service.init_new_patron = function() {

        var addr = {
            valid : true,
            within_city_limits : true
            // default state, etc.
        };

        return {
            isnew : true,
            active : true,
            card : {},
            home_ou : egCore.org.get(egCore.auth.user().ws_ou()),
            // TODO default profile group?
            mailing_address : addr,
            addresses : [addr]
        };
    }

    return service;
}]);


function PatronRegCtrl($scope, $routeParams, 
    $q, $modal, egCore, patronSvc, patronRegSvc) {


    $scope.clone_id = $routeParams.clone_id;
    $scope.stage_username = $routeParams.stage_username;
    $scope.patron_id = 
        patronRegSvc.patron_id = $routeParams.edit_id || $routeParams.id;

    if (!$scope.edit_passthru) {
        // in edit more, scope.edit_passthru is delivered to us by
        // the enclosing controller.  In register mode, there is 
        // no enclosing controller, so we create our own.
        $scope.edit_passthru = {};
    }

    // 0=all, 1=suggested, 2=all
    $scope.edit_passthru.vis_level = 0; 
    // TODO: add save/clone handlers here

    $q.all([

        $scope.initTab ? // initTab comes from patron app
            $scope.initTab('edit', $routeParams.id) : $q.when(),

        patronRegSvc.init()

    ]).then(function() {
        // called after initTab and patronRegSvc.init have completed

        var prs = patronRegSvc; // brevity
        // in standalone mode, we have no patronSvc
        $scope.patron = prs.init_patron(patronSvc ? patronSvc.current : null);
        $scope.field_doc = prs.field_doc;
        $scope.profiles = prs.profiles;
        $scope.ident_types = prs.ident_types;
        $scope.net_access_levels = prs.net_access_levels;
        $scope.user_settings = prs.user_settings;
        $scope.user_setting_types = prs.user_setting_types;
        $scope.modified_user_settings = prs.modified_user_settings;
        $scope.org_settings = prs.org_settings;
        $scope.sms_carriers = prs.sms_carriers;
        $scope.stat_cats = prs.stat_cats;
        $scope.surveys = prs.surveys;

        if ($scope.org_settings['ui.patron.edit.default_suggested'])
            $scope.edit_passthru.vis_level = 1;
    });

    // returns the tree depth of the selected profile group tree node.
    $scope.pgt_depth = function(grp) {
        var d = 0;
        while (grp = egCore.env.pgt.map[grp.parent()]) d++;
        return d;
    }

    // IDL fields used for labels in the UI.
    $scope.idl_fields = {
        au  : egCore.idl.classes.au.field_map,
        ac  : egCore.idl.classes.ac.field_map,
        aua : egCore.idl.classes.aua.field_map
    };

    // field visibility cache.  Some fields are universally required.
    var field_visibility = {
        'ac.barcode' : 2,
        'au.usrname' : 2,
        'au.passwd' :  2,
        // TODO passwd2 2,
        'au.first_given_name' : 2,
        'au.family_name' : 2,
        'au.ident_type' : 2,
        'au.home_ou' : 2,
        'au.profile' : 2,
        'au.expire_date' : 2,
        'au.net_access_level' : 2,
        'aua.address_type' : 2,
        'aua.post_code' : 2,
        'aua.street1' : 2,
        'aua.street2' : 2,
        'aua.city' : 2,
        'aua.county' : 2,
        'aua.state' : 2,
        'aua.country' : 2,
        'aua.valid' : 2,
        'aua.within_city_limits' : 2,
        'stat_cats' : 1,
        'surveys' : 1
    }; 

    // returns true if the selected field should be visible
    // given the current required/suggested/all setting.
    $scope.show_field = function(field_key) {

        if (field_visibility[field_key] == undefined) {
            // compile and cache the visibility for the selected field

            // org settings have not been received yet.
            if (!$scope.org_settings) return false;

            var req_set = 'ui.patron.edit.' + field_key + '.require';
            var sho_set = 'ui.patron.edit.' + field_key + '.show';
            var sug_set = 'ui.patron.edit.' + field_key + '.suggest';

            if ($scope.org_settings[req_set]) {
                field_visibility[field_key] = 2;
            } else if ($scope.org_settings[sho_set]) {
                field_visibility[field_key] = 2;
            } else if ($scope.org_settings[sug_set]) {
                field_visibility[field_key] = 1;
            } else {
                field_visibility[field_key] = 0;
            }
        }

        return field_visibility[field_key] >= $scope.edit_passthru.vis_level;
    }

    // generates a random 4-digit password
    $scope.generate_password = function() {
        $scope.patron.passwd = Math.floor(Math.random()*9000) + 1000;
    }

    $scope.set_expire_date = function() {
        if (!$scope.patron.profile) return;
        var seconds = egCore.date.intervalToSeconds(
            $scope.patron.profile.perm_interval());
        var now_epoch = new Date().getTime();
        $scope.patron.expire_date = new Date(
            now_epoch + (seconds * 1000 /* milliseconds */))
    }

    // grp is the pgt object
    $scope.set_profile = function(grp) {
        $scope.patron.profile = grp;
        $scope.set_expire_date();
    }

    var new_addr_id = -1;
    $scope.new_address = function() {
        var addr = egCore.idl.toHash(new egCore.idl.aua());
        patronRegSvc.ingest_address($scope.patron, addr);
        addr.id = new_addr_id--;
        addr.valid = true;
        addr.within_city_limits = true;
        $scope.patron.addresses.push(addr);
    }

    // keep deleted addresses out of the patron object so
    // they won't appear in the UI.  They'll be re-inserted
    // when the patron is updated.
    deleted_addresses = [];
    $scope.delete_address = function(id) {
        var addresses = [];
        angular.forEach($scope.patron.addresses, function(addr) {
            if (addr.id == id) {
                if (id > 0) {
                    addr.isdeleted = true;
                    deleted_addresses.push(addr);
                }
            } else {
                addresses.push(addr);
            }
        });
        $scope.patron.addresses = addresses;
    } 

    $scope.post_code_changed = function(addr) { 
        egCore.net.request(
            'open-ils.search', 'open-ils.search.zip', addr.post_code)
        .then(function(resp) {
            if (!resp) return;
            if (resp.city) addr.city = resp.city;
            if (resp.state) addr.state = resp.state;
            if (resp.county) addr.county = resp.county;
            if (resp.alert) alert(resp.alert);
        });
    }

    $scope.cards_dialog = function() {
        $modal.open({
            templateUrl: './circ/patron/t_patron_cards_dialog',
            controller: 
                   ['$scope','$modalInstance','cards',
            function($scope , $modalInstance , cards) {
                // scope here is the modal-level scope
                $scope.args = {cards : cards};
                $scope.ok = function() { $modalInstance.close($scope.args) }
                $scope.cancel = function () { $modalInstance.dismiss() }
            }],
            resolve : {
                cards : function() {
                    // scope here is the controller-level scope
                    return $scope.patron.cards;
                }
            }
        }).result.then(
            function(args) {
                angular.forEach(args.cards, function(card) {
                    card.ischanged = true; // assume cards need updating, OK?
                    if (card._primary == 'on' && 
                        card.id != $scope.patron.card.id) {
                        $scope.patron.card = card;
                    }
                });
            }
        );
    }

}


// TODO: $inject controller params 
