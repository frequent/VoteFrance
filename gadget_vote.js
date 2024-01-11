/*jslint nomen: true, indent: 2, maxlen: 80 */
/*global window, rJS, RSVP, Math, Date, ics, saveAs, SimpleQuery, Query, JSON */
(function (window, rJS, RSVP, Math, Date, ics, saveAs, SimpleQuery, Query, JSON) {
    "use strict";

  /////////////////////////////
  // parameters
  /////////////////////////////
  var STR = "";
  var PLACEHOLDER = "-";
  var ACTIVE = "is-active";
  var KLASS = rJS(window);
  var CANVAS = "canvas";
  var ARR = [];
  var BLANK = "_blank";
  var NAME = "name";
  var DATA_SET = "annuaire-de-ladministration-base-de-donnees-locales";
  var VOTE = "vote_jio";
  var ODS = "ods_jio";
  var DIALOG_ACTIVE = "vote-dialog-active";
  var LOCATION = window.location;
  var DOCUMENT = window.document;
  var FILENAME = "Please-register-to-vote.ics";
  var INTERSECTION_OBSERVER = window.IntersectionObserver;
  var TEMPLATE_PARSER = /\{([^{}]*)\}/g;
  var DEFAULT_REMINDER = "Reminder: Register for Eurpean Elections.";
  var DEFAULT_DATE = "04/28/2024 09:00:00 AM GMT+0100";
  var POPPER = "width=600,height=480,resizable=yes,scrollbars=yes,status=yes";
  var LANG = "https://raw.githubusercontent.com/frequent/VoteFrance/master/lang/";
  var DEADLINE = "05/05/2024 6:00:00 PM GMT+0100";
  var SEARCHING = "searching";
  var SUMMARY = "Every vote will count in the 2024 European Elections. Including yours. Sign up on the electoral list for Europeans.";
  var SOCIAL_MEDIA_CONFIG = {
    "facebook": "https://www.facebook.com/sharer.php?u={url}",
    "twitter": "https://twitter.com/intent/tweet?url={url}&text={summary}&hashtags={tag_list}",
    "linkedin": "https://www.linkedin.com/sharing/share-offsite/?url={url}&mini=true&source={source}"
  };

  /////////////////////////////
  // methods
  /////////////////////////////
  // thanks for nothing ChatGPT
  function getCroatianTimeForm(number, unit) {
    function belongsToOneOfThreeGroups(num) {
      return (num % 10 === 1 && num !== 11) ||
             (num % 10 >= 2 && num % 10 <= 4 && (num < 12 || num > 14));
    }
  
    function getForm(num, unit) {
      if (unit === 'seconds' || unit === 'second') {
        if (num === 1) {
          return 'sekunda';
        } else if (belongsToOneOfThreeGroups(num)) {
          return 'sekunde';
        } else {
          return 'sekundi';
        }
      } else if (unit === 'minutes' || unit === 'minute') {
        if (num === 1) {
          return 'minuta';
        } else if (belongsToOneOfThreeGroups(num)) {
          return 'minute';
        } else {
          return 'minuta';
        }
      } else if (unit === 'hours' || unit === 'hour') {
        if (num === 1) {
          return 'sat';
        } else if (belongsToOneOfThreeGroups(num)) {
          return 'sata';
        } else {
          return 'sati';
        }
      } else if (unit === 'days' || unit === 'day') {
        if (num === 1) {
          return 'dan';
        } else if (belongsToOneOfThreeGroups(num)) {
          return 'dana';
        } else {
          return 'dani';
        }
      } else {
        return 'Invalid time unit';
      }
    }
  
    return getForm(number, unit);
  }

  function launchCountdown(my_end_date, my_element, my_state) {
    var days;
    var hours;
    var minutes;
    var seconds;
    var end_date = new Date(my_end_date).getTime();

    if (isNaN(end_date)) {
      return;
    }

    function calculate() {
      var start_date = new Date().getTime();
      var time_remaining = parseInt((end_date - start_date) / 1000, 10);
      if (time_remaining >= 0) {
        days = parseInt(time_remaining / 86400, 10);
        time_remaining = (time_remaining % 86400);
        hours = parseInt(time_remaining / 3600, 10);
        time_remaining = (time_remaining % 3600);
        minutes = parseInt(time_remaining / 60, 10);
        time_remaining = (time_remaining % 60);
        seconds = parseInt(time_remaining, 10);

        // sonderlocking for Croatian :)
        if (my_state.locale === "hr") {
         getElem(my_element, "[data-i18n='days']").textContent = getCroatianTimeForm(days, "days");
         getElem(my_element, "[data-i18n='hours']").textContent = getCroatianTimeForm(days, "hours");
         getElem(my_element, "[data-i18n='minutes']").textContent = getCroatianTimeForm(days, "minutes");
         getElem(my_element, "[data-i18n='seconds']").textContent = getCroatianTimeForm(seconds, "seconds");
        }
        getElem(my_element, ".days").textContent = parseInt(days, 10);
        getElem(my_element, ".hours").textContent = ("0" + hours).slice(-2);
        getElem(my_element, ".minutes").textContent = ("0" + minutes).slice(-2);
        getElem(my_element, ".seconds").textContent = ("0" + seconds).slice(-2);
      }
    }
    window.setInterval(calculate, 1000);
  }

  function getElem(my_element, my_selector) {
    return my_element.querySelector(my_selector);
  }

  function mergeDict(my_return_dict, my_new_dict) {
    return Object.keys(my_new_dict).reduce(function (pass_dict, key) {
      pass_dict[key] = my_new_dict[key];
      return pass_dict;
    }, my_return_dict);
  }

  // poor man's templates. thx, http://javascript.crockford.com/remedial.html
  if (!String.prototype.supplant) {
    String.prototype.supplant = function (o) {
      return this.replace(TEMPLATE_PARSER, function (a, b) {
        var r = o[b];
        return typeof r === "string" || typeof r === "number" ? r : a;
      });
    };
  }

  function getTemplate(my_klass, my_id) {
    return my_klass.__template_element.getElementById(my_id).innerHTML;
  }

  function purgeDom(my_node) {
    while (my_node.firstChild) {
      my_node.removeChild(my_node.firstChild);
    }
  }

  function setDom(my_node, my_string, my_purge) {
    var faux_element = DOCUMENT.createElement(CANVAS);
    if (my_purge) {
      purgeDom(my_node);
    }
    faux_element.innerHTML = my_string;
    ARR.slice.call(faux_element.children).forEach(function (element) {
      my_node.appendChild(element);
    });
  }

  function getLang(nav) {
    return (nav.languages ? nav.languages[0] : (nav.language || nav.userLanguage));
  }

  function getVoteConfig(my_language) {
    return {
      "type": "vote_storage",
      "repo": "VoteFrance",
      "path": "lang/" + my_language
      //"__debug": "https://softinst56756.host.vifib.net/public/project/VoteFrance/lang/" + my_language + "/debug.json"
    };
  }

  function getOdsConfig(my_data_set) {
    return {
      "type": "ods_storage",
      "data_set": my_data_set
    };
  }

  function setQuery(my_key, my_val) {
    return new SimpleQuery({"key": my_key, "value": my_val, "type": "simple"});
  }

  function decomposeAdresse(my_adress) {
   if (my_adress.startsWith('[')) {
     return JSON.parse(my_adress).join("\n\r");
   } else {
     return my_adress;
   }
  }

  KLASS

    /////////////////////////////
    // state
    /////////////////////////////
    .setState({
      "locale": getLang(window.navigator).substring(0, 2) || "en",
      "online": null,
      "sw_errors": 0,
      "is_searching": false,
      "next_page_token": 0
    })

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function (gadget) {
      var element = gadget.element;
      gadget.property_dict = {
        "search_input": getElem(element, ".vote-search-input"),
        "search_result_container": getElem(element, ".vote-search-results"),
        "dialog": getElem(gadget.element, ".vote-dialog"),
        "dialog_content": getElem(gadget.element, ".vote-dialog-content"),
        "total_results": getElem(gadget.element, ".vote-total_results"),

        // yaya, should be localstorage caling repair to sync
        "url_dict": {},
        "content_dict": {},
        "i18n_dict": {},

        "search_list": []
      };
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod("translateDom", "translateDom")

    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////

    // ---------------------- JIO bridge ---------------------------------------
    .declareMethod("route", function (my_scope, my_call, my_p1, my_p2, my_p3) {
      return this.getDeclaredGadget(my_scope)
        .push(function (my_gadget) {
          return my_gadget[my_call](my_p1, my_p2, my_p3);
        });
    })

    .declareMethod("vote_create", function (my_option_dict) {
      return this.route(VOTE, "createJIO", my_option_dict);
    })
    .declareMethod("vote_get", function (my_id) {
      return this.route(VOTE, "get", my_id);
    })
    .declareMethod("vote_allDocs", function () {
      return this.route(VOTE, "allDocs");
    })

    .declareMethod("ods_create", function (my_option_dict) {
      return this.route(ODS, "createJIO", my_option_dict);
    })
    .declareMethod("ods_allDocs", function (my_query) {
      return this.route(ODS, "allDocs", my_query);
    })
    .declareMethod("ods_get", function(my_id) {
      var gadget = this;
      var dict = gadget.property_dict;
      var i;
      var len;

      // yeah, we don't, it's either on the shelf or bad luck
      // return this.route(ODS, "get", my_id);

      for (i = 0; i < dict.search_list.length; i += 1) {
        if (dict.search_list[i].id === my_id) {
          return dict.search_list[i];
        }
      }

      // not found - fake a 404
      throw new jIO.util.jIOError("Cannot find document: " + id, 404);
    })

    .declareMethod("stateChange", function (delta) {
      var gadget = this;
      var state = gadget.state;

      if (delta.hasOwnProperty("locale")) {
        state.locale = delta.locale;
      }
      if (delta.hasOwnProperty("mode")) {
        state.mode = delta.mode;
      }
      if (delta.hasOwnProperty("online")) {
        state.online = delta.online;
        if (state.online) {
          gadget.element.classList.remove("vote-offline");
        } else {
          gadget.element.classList.add("vote-offline");
        }
      }
      //if (delta.hasOwnProperty("sw_errors")) {
      //  state.sw_errors = delta.sw_errors;
      //}
      return;
    })

    .declareMethod("runSearch", function (my_start_index) {
      var gadget = this;
      var dict = gadget.property_dict;
      var state = gadget.state;
      var search_input = dict.search_input.value;

      if (search_input.length < 4) {
        return;
      }
      if (state.is_searching) {
        state.is_searching = false;
      }
      gadget.state.is_searching = true;

      return new RSVP.Queue()
        .push(function () {
          var query;
          if (my_start_index) {
            query = {
              type: "complex",
              operator: "AND",
              query_list: [{
                type: "simple",
                key: "q",
                value: search_input+" Mairie"
              }, {
                type: "simple",
                key: "token",
                value: my_start_index + 1
              }]
            };
          } else {
            query = setQuery("q", search_input+" Mairie");
          }
          return RSVP.all([
            gadget.ods_allDocs({"query": Query.objectToSearchText(query)}),
            gadget.enterSearch()
          ]);
        })
        .push(function (my_response_list) {
          var response = my_response_list[0];
          var total = response.data.rows.nhits;
          var item;
          var i;
          dict.search_list = [];
          for (i = 0; i < response.data.total_rows; i += 1) {
            item = response.data.rows[i];
            item.fields.id = item.recordid;
            dict.search_list.push(item.fields);
          }
          gadget.state.total_results = total;
          if (total > 10) {
            dict.total_results.textContent = "(" + total + ")";
            gadget.state.next_page_token += response.data.total_rows;
          }
          return gadget.buildResultList();
        })
        .push(function () {
          gadget.state.is_searching = false;

        })
        .push(undefined, function (error) {
          return gadget.handleError(error);
        });
    })

    .declareMethod("buildResultList", function () {
      var gadget = this;
      var dict = gadget.property_dict;
      var response = STR;
      dict.search_list.forEach(function (item) {
        response += getTemplate(KLASS, "result_list_template").supplant({
          "id": item.id,
          "nom": item.nom,
          "adresse": item.adresse_codepostal + " " + item.adresse_nomcommune
        });
      });
      if (response !== STR) {
        setDom(dict.search_result_container, response, true);
      }
      window.componentHandler.upgradeElements(dict.search_result_container);
    })

    // thx: https://css-tricks.com/simple-social-sharing-links/
    // twitter prevalidate url: https://cards-dev.twitter.com/validator
    // https://developers.facebook.com/docs/sharing/best-practices/
    .declareMethod("shareUrl", function (my_scm) {
      var popup;
      var is_mobile = window.matchMedia("only screen and (max-width: 48em)");
      var popup_resolver;

      // lots of bells and whistles for trying to stay on the page, use this
      // with localstorage is we want to keep state or login on social media
      var resolver = new Promise(function (resolve, reject) {
        popup_resolver = function resolver(href) {
          return resolve({});
        };
      });

      popup = window.open(
        SOCIAL_MEDIA_CONFIG[my_scm].supplant({
          "url": window.encodeURIComponent(LOCATION.href),
          "summary": SUMMARY,
          "source":"votefrance.eu",
          "tag_list": "votefrance,unvotepourleurope,europeennes2024,europeennes"
        }),
        is_mobile.matches ? BLANK : STR,
        is_mobile.matches ? null : POPPER
      );
      popup.opener.popup_resolver = popup_resolver;
      return window.promiseEventListener(popup, "load", true);
    })

    .declareMethod("createIcsFile", function (my_target) {
      var gadget = this;
      var cal = ics();
      var description = STR;
      var subject = my_target.vote_remind_subject;
      var begin = my_target.vote_remind_date;
      var location = my_target.vote_remind_location;
      cal.addEvent(
        subject ? subject.value : DEFAULT_REMINDER,
        description,
        (location && (location.checked && gadget.state.location)) ? gadget.state.location.replace(/[\r\n]+/g, " ") : STR,
        begin ? begin.value : DEFAULT_DATE,
        DEADLINE
      );
      cal.download(FILENAME);
    })

    .declareMethod("enterSearch", function () {
      if (this.state.mode !== SEARCHING) {
        return this.stateChange({"mode": SEARCHING});
      }
    })

    .declareMethod("fetchTranslationAndUpdateDom", function (my_language) {
      var gadget = this;
      var dict = gadget.property_dict;
      var url_dict = dict.url_dict;
      return new RSVP.Queue()
        .push(function () {
          return gadget.vote_get(url_dict.ui);
        })
        .push(function (data) {
          dict.i18n_dict = data;
          return gadget.translateDom(data);
        });
    })

    .declareMethod("updateStorage", function (my_language) {
      var gadget = this;
      if (my_language === gadget.state.locale) {
        return;
      }
      return new RSVP.Queue()
        .push(function () {
          return gadget.stateChange({"locale": my_language});
        })
        .push(function () {
          return gadget.vote_create(getVoteConfig(my_language));
        })
        .push(function () {
          return gadget.buildVoteLookupDict();
        })
        .push(function () {
          return gadget.fetchTranslationAndUpdateDom();
        });
    })

    .declareMethod("buildVoteLookupDict", function () {
      var gadget = this;
      var dict = gadget.property_dict;
      return new RSVP.Queue()
        .push(function () {
          return gadget.vote_allDocs();
        })
        .push(function (my_file_list) {
          if (my_file_list.data.total_rows === 0) {
            return gadget.updateStorage("en");
          }
          my_file_list.data.rows.map(function (row) {
            dict.url_dict[row.id.split("/").pop().replace(".json", "")] = row.id;
          });
        })

        // we only need a language to build the dict, so in case of errors like
        // on OS X/Safari 9, which cannot handle Github APIv3 redirect, we just
        // build the damn thing by hand... and fail somewhere else
        .push(undefined, function(whatever) {
          var i;
          for (i = 1; i < 32; i += 1) {
            dict.url_dict[i] = LANG + gadget.state.locale + "/" + i + ".json";
          }
          dict.url_dict["ui"] = LANG + gadget.state.locale + "/ui.json";
        });
    })

    // -------------------.--- Render ------------------------------------------
    .declareMethod("render", function (my_option_dict) {
      var gadget = this;
      var dict = gadget.property_dict;

      window.componentHandler.upgradeDom();
      mergeDict(dict, my_option_dict);
      return new RSVP.Queue()
        .push(function () {
          launchCountdown(DEADLINE, gadget.element, gadget.state);
          return RSVP.all([
            gadget.vote_create(getVoteConfig(gadget.state.locale)),
            gadget.ods_create(getOdsConfig(DATA_SET))
          ]);
        })
        .push(function () {
          return gadget.buildVoteLookupDict();
        })
        .push(function () {
          return gadget.fetchTranslationAndUpdateDom(gadget.state.locale);
        });
    })

    .declareMethod("handleError", function (my_err, my_err_dict) {
      var gadget = this;
      var code;
      var err = my_err.target ? JSON.parse(my_err.target.response).error : my_err;

      for (code in my_err_dict) {
        if (my_err_dict.hasOwnProperty(code)) {
          if ((err.status_code + STR) === code) {
            return my_err_dict[code];
          }
        }
      }
      throw err;
    })

    .declareMethod("showDialog", function (my_event) {
      var gadget = this;
      var dict = gadget.property_dict;
      var dialog = dict.dialog;

      return new RSVP.Queue()
        .push(function () {
          return gadget.ods_get(my_event.target.record_id.value);
        })
        .push(function (my_data) {
          var response = STR;
          response += getTemplate(KLASS, "result_detail_template").supplant({
            "adresse": decomposeAdresse(my_data.adresse_ligne) + "\r\n" + my_data.adresse_codepostal + " " + my_data.adresse_nomcommune,
            "name": my_data.nom,
            "mail": my_data.coordonneesnum_email || PLACEHOLDER,
            "site": my_data.coordonneesnum_url  || PLACEHOLDER,
            "tel": my_data.tel_affichage || PLACEHOLDER,
            "fax": my_data.tel_affichage || PLACEHOLDER,
            "lat": my_data.coordonnees[0],
            "lng": my_data.coordonnees[1]
          });
          setDom(dict.dialog_content, response, true);
          window.componentHandler.upgradeElements(dict.dialog_content);
          return gadget.translateDom(dict.i18n_dict, dialog);
        })
        .push(function () {
          return gadget.handleDialog();
        });
    })

    .declareMethod("handleDialog", function (keyBoardOverride) {
      var gadget = this;
      var dict = gadget.property_dict;
      var dialog = dict.dialog;
      var active_element = DOCUMENT.activeElement;

      function closeDialog() {
        dialog.classList.remove(DIALOG_ACTIVE);
        return;
      }

      if (dialog.classList.contains(DIALOG_ACTIVE)) {
        return closeDialog();
      }
      if (!dialog.classList.contains(DIALOG_ACTIVE)) {
        dialog.classList.add(DIALOG_ACTIVE);
      }
      return;
    })

    /////////////////////////////
    // declared jobs
    /////////////////////////////
    .declareJob("bufferKeyInput", function (my_event) {
      var gadget = this;
      return new RSVP.Queue()
        .push(function() {
          return RSVP.delay(500);
        })
        .push(function () {
          gadget.state.is_searching = false;
          return gadget.enterSearch();
        })
        .push(function () {
          return gadget.runSearch();
        });
    })

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      var body = DOCUMENT.body;
      var seo = body.querySelector(".vote-seo-content");
      seo.parentElement.removeChild(seo);
      body.classList.remove("vote-splash");     
    })

    /////////////////////////////
    // on Event
    /////////////////////////////
    .onEvent("input", function (event) {
      switch (event.target.getAttribute(NAME)) {
        case "vote-search-input":
          return this.bufferKeyInput(event);
      }
    })

    .onEvent("submit", function (event) {
      switch (event.target.getAttribute(NAME)) {
        case "vote-share-facebook":
          return this.shareUrl("facebook");
        case "vote-share-twitter":
          return this.shareUrl("twitter");
        case "vote-share-linkedin":
          return this.shareUrl("linkedin");
        case "vote-select-language":
          return this.updateStorage(event.target.vote_language.value);
        case "vote_remind":
          return this.createIcsFile(event.target);
        case "vote-remind-week":
          return this.createIcsFile(event.target);
        case "vote-search-mairie":
          return this.runSearch();
        case "vote-load-more":
          return this.runSearch(this.state.next_page_token);
        case "vote-result-details":
          return this.showDialog(event);
        case "vote-dialog-close":
          return this.handleDialog();
        case "vote-clear-list":
          this.property_dict.search_list = [];
          purgeDom(this.property_dict.search_result_container);
          purgeDom(this.property_dict.total_results);
          break;
        case "volt-store-location":
          this.state.location = event.target.vote_location.value;
          return this.handleDialog();
      }
    });


}(window, rJS, RSVP, Math, Date, ics, saveAs, SimpleQuery, Query, JSON));