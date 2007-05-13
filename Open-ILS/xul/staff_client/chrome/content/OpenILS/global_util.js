	function ses(a) {
		JSAN.use('OpenILS.data'); var data = new OpenILS.data(); data.init({'via':'stash'});
		switch(a) {
			case 'authtime' :
				return data.session.authtime;
			break;
			case 'key':
			default:
				return data.session.key;
			break;
		}
	}

	function font_helper() {
		try {
			JSAN.use('OpenILS.data'); var data = new OpenILS.data(); data.init({'via':'stash'});
			removeCSSClass(document.documentElement,'ALL_FONTS_LARGER');
			removeCSSClass(document.documentElement,'ALL_FONTS_SMALLER');
			removeCSSClass(document.documentElement,'ALL_FONTS_XX_SMALL');
			removeCSSClass(document.documentElement,'ALL_FONTS_X_SMALL');
			removeCSSClass(document.documentElement,'ALL_FONTS_SMALL');
			removeCSSClass(document.documentElement,'ALL_FONTS_MEDIUM');
			removeCSSClass(document.documentElement,'ALL_FONTS_LARGE');
			removeCSSClass(document.documentElement,'ALL_FONTS_X_LARGE');
			removeCSSClass(document.documentElement,'ALL_FONTS_XX_LARGE');
			addCSSClass(document.documentElement,data.global_font_adjust);
		} catch(E) {
			alert("Error with adjusting the font size: " + E);
		}
	}

	function update_modal_xulG(v) {
		try {
			JSAN.use('OpenILS.data'); var data = new OpenILS.data(); data.init({'via':'stash'});
			var key = location.pathname + location.search + location.hash;
			if (typeof data.modal_xulG_stack != 'undefined' && typeof data.modal_xulG_stack[key] != 'undefined') {
				data.modal_xulG_stack[key][ data.modal_xulG_stack[key].length - 1 ] = v;
				data.stash('modal_xulG_stack');
			}
		} catch(E) {
			alert('FIXME: update_modal_xulG => ' + E);
		}
	}

	function xul_param(param_name,_params) {
		/* By default, this function looks for a CGI-style query param identified by param_name.  If one isn't found, it then looks in xulG.  If one still isn't found, and _params.stash_name is true, it looks in the global xpcom stash for the field identified by stash_name.  If _params.concat is true, then it looks in all these places and concatenates the results.  There are also options for converting JSON to javascript objects, and clearing the xpcom stash_name field after retrieval.  Also added, ability to search a specific spot in the xpcom stash that implements a stack to hold xulG's for modal windows */
		try {
			dump('xul_param('+param_name+','+js2JSON(_params)+')\n');
			var value = undefined; if (!_params) _params = {};
			if (typeof _params.no_cgi == 'undefined') {
				var cgi = new CGI();
				if (cgi.param(param_name)) {
					var x = cgi.param(param_name);
					dump('\tfound via location.href = ' + x + '\n');
					if (typeof _params.JSON2js_if_cgi != 'undefined') {
						x = JSON2js( x );
						dump('\tJSON2js = ' + x + '\n');
					}
					if (typeof _params.concat == 'undefined') {
						//alert(param_name + ' x = ' + x);
						return x; // value
					} else {
						if (value) {
							if (value.constructor != Array) value = [ value ];
							value = value.concat(x);
						} else {
							value = x;
						}
					}
				}
			}
			if (typeof _params.no_xulG == 'undefined') {
				if (typeof _params.modal_xulG != 'undefined') {
					JSAN.use('OpenILS.data'); var data = new OpenILS.data(); data.init({'via':'stash'});
					var key = location.pathname + location.search + location.hash;
					dump('xul_param, considering modal key = ' + key + '\n');
					if (typeof data.modal_xulG_stack != 'undefined' && typeof data.modal_xulG_stack[key] != 'undefined') {
						xulG = data.modal_xulG_stack[key][ data.modal_xulG_stack[key].length - 1 ];
					}
				}
				if (typeof xulG == 'object' && typeof xulG[ param_name ] != 'undefined') {
					var x = xulG[ param_name ];
					dump('\tfound via xulG = ' + x + '\n');
					if (typeof _params.JSON2js_if_xulG != 'undefined') {
						x = JSON2js( x );
						dump('\tJSON2js = ' + x + '\n');
					}
					if (typeof _params.concat == 'undefined') {
						//alert(param_name + ' x = ' + x);
						return x; // value
					} else {
						if (value) {
							if (value.constructor != Array) value = [ value ];
							value = value.concat(x);
						} else {
							value = x;
						}
					}
				}
			}
			if (typeof _params.no_xpcom == 'undefined') {
				/* the field names used for temp variables in the global stash tend to be more unique than xuLG or CGI param names, to avoid collisions */
				if (typeof _params.stash_name != 'undefined') { 
					JSAN.use('OpenILS.data'); var data = new OpenILS.data(); data.init({'via':'stash'});
					if (typeof data[ _params.stash_name ] != 'undefined') {
						var x = data[ _params.stash_name ];
						dump('\tfound via xpcom = ' + x + '\n');
						if (typeof _params.JSON2js_if_xpcom != 'undefined') {
							x = JSON2js( x );
							dump('\tJSON2js = ' + x + '\n');
						}
						if (_params.clear_xpcom) { 
							data[ _params.stash_name ] = undefined; data.stash( _params.stash_name ); 
						}
						if (typeof _params.concat == 'undefined') {
							//alert(param_name + ' x = ' + x);
							return x; // value
						} else {
							if (value) {
								if (value.constructor != Array) value = [ value ];
								value = value.concat(x);
							} else {
								value = x;
							}
						}
					}
				}
			}
			//alert(param_name + ' value = ' + value);
			return value;
		} catch(E) {
			dump('xul_param error: ' + E + '\n');
		}
	}

	function get_bool(a) {
		// Normal javascript interpretation except 'f' == false, per postgres, and 'F' == false
		// So false includes 'f', '', 0, null, and undefined
		if (a == 'f') return false;
		if (a == 'F') return false;
		if (a) return true; else return false;
	}

	function get_db_true() {
		return 't';
	}

	function get_db_false() {
		return 'f';
	}

	function copy_to_clipboard(ev) {
		try {
			netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
			var text;
			if (typeof ev == 'object') {
				if (typeof ev.target != 'undefined') {
					if (typeof ev.target.textContent != 'undefined') if (ev.target.textContent) text = ev.target.textContent;
					if (typeof ev.target.value != 'undefined') if (ev.target.value) text = ev.target.value;
				}
			} else if (typeof ev == 'string') {
				text = ev;
			}
			const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
				.getService(Components.interfaces.nsIClipboardHelper);
			gClipboardHelper.copyString(text);
			alert('Copied "'+text+'" to clipboard.');
		} catch(E) {
			alert('Clipboard action failed: ' + E);	
		}
	}

	function clear_the_cache() {
		try {
			netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
			var cacheClass 		= Components.classes["@mozilla.org/network/cache-service;1"];
			var cacheService	= cacheClass.getService(Components.interfaces.nsICacheService);
			cacheService.evictEntries(Components.interfaces.nsICache.STORE_ON_DISK);
			cacheService.evictEntries(Components.interfaces.nsICache.STORE_IN_MEMORY);
		} catch(E) {
			alert('Problem clearing the cache: ' + E);
		}
	}

