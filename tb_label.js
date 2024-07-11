// SEUL LINK PEUT VAINCRE GANON

/*
Version: 1.4.0
Author: Michael Kefeder
https://github.com/mike-kfed/roundcube-thunderbird_labels
 */
var escape_jquery_selector,
  i18n_label, // convertit un nom d'étiquette brut en nom d'étiquette lisible (ex: $LABEL1 -> Chloé)
  rcm_tb_label_css,
  rcm_tb_label_find_main_window,
  rcm_tb_label_flag_msgs, // allume une étiquette sur un ou plusieurs messsages EN FRONTEND
  rcm_tb_label_flag_toggle, // définit l'état d'une étiquette sur un ou plusieurs messages EN FRONTEND
  rcm_tb_label_get_selection, // récupère les uid du ou des messages sélectionné(s)
  rcm_tb_label_global, // récupère une variable globale roundcube
  rcm_tb_label_global_set, // assigne une variable globale roundcube
  rcm_tb_label_insert,
  rcm_tb_label_menuclick,
  rcm_tb_label_submenu,
  rcm_tb_label_toggle,
  rcm_tb_label_unflag_msgs,
  rcmail_ctxm_label,
  rcmail_ctxm_label_set,
  slice = [].slice;

$(function () {
  var css, labelbox_parent, labels_for_message;
  css = new rcm_tb_label_css();
  css.inject();
  // superglobal variable set? if not set it
  if (rcm_tb_label_global("tb_labels_for_message") == null) {
    rcm_tb_label_global_set("tb_labels_for_message", []);
  }
  // if exists add contextmenu entries
  if (window.rcm_contextmenu_register_command) {
    rcm_contextmenu_register_command(
      "ctxm_tb_label",
      rcmail_ctxm_label,
      $("#tb_label_ctxm_mainmenu"),
      "moreacts",
      "after",
      true
    );
  }
  // single message displayed?
  labels_for_message = tb_labels_for_message;
  if (labels_for_message) {
    labelbox_parent = $("div.message-headers, #message-header");
    // larry skin
    if (!labelbox_parent.length) {
      labelbox_parent = $("table.headers-table");
    }
    // classic skin
    labelbox_parent.append(
      '<div id="labelbox" class="' + rcmail.env.tb_label_style + '"></div>'
    );
    labels_for_message.sort(function (a, b) {
      return a - b;
    });
    jQuery.each(labels_for_message, function (idx, val) {
      rcm_tb_label_flag_msgs([-1], val); // WTF
    });
    rcm_tb_label_global_set("tb_labels_for_message", labels_for_message);
  }
  // This hook is triggered after a new row was added to the message message_list
  // or the contacts list respectively.
  rcmail.addEventListener("insertrow", function (event) {
    rcm_tb_label_insert(event.uid, event.row);
  });
  // This is the place where plugins can add their UI elements and register custom commands.
  rcmail.addEventListener("init", function (evt) {
    rcmail.register_command(
      "plugin.thunderbird_labels.rcm_tb_label_submenu",
      rcm_tb_label_submenu,
      rcmail.env.uid
    );
    rcmail.register_command(
      "plugin.thunderbird_labels.rcm_tb_label_menuclick",
      rcm_tb_label_menuclick,
      rcmail.env.uid
    );
    if (rcmail.message_list) {
      rcmail.message_list.addEventListener("select", function (list) {
        rcmail.enable_command(
          "plugin.thunderbird_labels.rcm_tb_label_submenu",
          list.get_selection().length > 0
        );
        rcmail.enable_command(
          "plugin.thunderbird_labels.rcm_tb_label_menuclick",
          list.get_selection().length > 0
        );
      });
    }
  });
  // handle response after refresh (try to update flags set by another
  // email-client while being logged into roundcube)
  rcmail.addEventListener("responsebeforerefresh", function (p) {
    var default_flags;
    // recent_flags env is set in php thunderbird_labels::check_recent_flags()
    if (p.response.env.recent_flags != null) {
      default_flags = [
        "SEEN",
        "UNSEEN",
        "ANSWERED",
        "FLAGGED",
        "DELETED",
        "DRAFT",
        "RECENT",
        "NONJUNK",
        "JUNK",
      ];
      $.each(p.response.env.recent_flags, function (uid, flags) {
        var message, unset_labels;
        message = rcmail.env.messages[uid];
        if (typeof message.flags.tb_labels === "object") {
          unset_labels = Array.from(message.flags.tb_labels); // D'abord on se débarrasse de toutes les étiquettes
        } else {
          unset_labels = rcmail.env.imap_labels.keys();
        }
        $.each(flags, function (flagname, flagvalue) {
          var pos;
          flagname = flagname.toUpperCase(); // tous les noms transmis seront en majuscule
          if (flagvalue && jQuery.inArray(flagname, default_flags) === -1) { // si c'est un flag custom
            rcm_tb_label_flag_msgs([uid], flagname); // allumer en frontend
            pos = jQuery.inArray(flagname, unset_labels);
            if (pos > -1) {
              return unset_labels.splice(pos, 1);
            }
          }
        });
        return $.each(unset_labels, function (idx, label_name) {
          console.log("unset", uid, label_name);
          return rcm_tb_label_unflag_msgs([uid], label_name);
        });
      });
    }
  });
  // add my submenu to roundcubes UI (for roundcube classic only?)
  if (window.rcube_mail_ui) {
    rcube_mail_ui.prototype.tb_label_popup_add = function () {
      var add, obj;
      add = {
        "tb-label-menu": {
          id: "tb-label-menu",
        },
      };
      this.popups = $.extend(this.popups, add);
      obj = $("#" + this.popups["tb-label-menu"].id);
      if (obj.length) {
        this.popups["tb-label-menu"].obj = obj;
      } else {
        delete this.popups["tb-label-menu"];
      }
    };
  }
  if (window.rcube_mail_ui) {
    rcube_mail_ui.prototype.check_tb_popup = function () {
      // larry skin doesn't have that variable, popup works automagically, return true
      if (typeof this.popups === "undefined") {
        return true;
      }
      if (this.popups["tb-label-menu"]) {
        return true;
      } else {
        return false;
      }
    };
  }
});
// prototype for string formatting
String.prototype.format = function () {
  var args;
  args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
  return this.replace(/{(\d+)}/g, function (match, number) {
    if (number < args.length) {
      return args[number];
    } else {
      return match;
    }
  });
};

rcm_tb_label_css = (function () {
  function rcm_tb_label_css() {
    this.label_colors = rcmail.env.imap_labels; // je ne sais même pas, j'essaie juste de toucher au minium de choses
  }

  rcm_tb_label_css.prototype.generate = function () {
    var css, ref;
    css = "";
    ref = this.label_colors;
    for (const [label_name, color] of Object.entries(ref)) {
      // css += "table.{0}\n{\n  background-color: {1};\n}".format(
      //   escaped_label_name,
      //   colors.bg
      // );
      css += `div#labelbox span.box_tb_label_${label_name}, .tb_label_badges.${label_name}
        {  background-color: ${color}; }
      div.contextmenu li .${label_name}
        { color: ${color}; }\n`;
    }
    return css;
  };

  rcm_tb_label_css.prototype.inject = function () {
    return $("<style>")
      .prop("type", "text/css")
      .html(this.generate())
      .appendTo("head");
  };

  return rcm_tb_label_css;
})();

// Shows the colors based on flag info like in Thunderbird
// (called when a new message in inserted in list of messages)
// maybe slow ? called for each message in mailbox at init
rcm_tb_label_insert = function (uid, row) {
  var i, j, label_name, len, len1, message, ref, ref1, rowobj, spanobj;
  if (
    typeof rcmail.env === "undefined" ||
    typeof rcmail.env.messages === "undefined"
  ) {
    return;
  }
  message = rcmail.env.messages[uid];
  rowobj = $(row.obj);
  // add span container for little colored bullets
  // rowobj
  //   .find("td.subject")
  //   .append(
  //     '<span class="tb_label_dots ' + rcmail.env.tb_label_style + '"></span>'
  //   );
  if (message.flags && message.flags.tb_labels) {
    if (message.flags.tb_labels.length) {
      spanobj = rowobj.find("td.subject");
      message.flags.tb_labels.sort(function (a, b) {
        return a - b;
      });
      ref = message.flags.tb_labels;
        // badges UI style
        for (i = 0, len = ref.length; i < len; i++) {
          label_name = ref[i];
          if (true) {
            spanobj.append(
              '<span class="tb_label_badges badge ' +
                label_name +
                '">' +
                i18n_label(label_name) +
                "</span>"
            );
          }
        }
      }
  }
};

// Problem: mail-preview-pane is an iframe, so referencing global variables does
// not work as intended. So here I try to find out where this javascript is run
// and when needed adjust the pointer to the main window object.
rcm_tb_label_find_main_window = function () {
  var elastic_popup_window, login_form, ms, popup_window, preview_frame, w;
  ms = $("#mainscreen");
  login_form = $("#login-form");
  preview_frame = $("#messagecontframe");
  popup_window = $("body.extwin");
  elastic_popup_window = $("body.action-show");
  // login form means no mainscreen current window is okay
  if (login_form.length) {
    return window;
  }
  // by default use current window
  w = window;
  // i have a mainscreen and preview_frame
  // this means i run in the main window
  if (ms.length && preview_frame.length) {
    w = window;
  }
  // if have no mainscreen and body has class iframe
  // this means i run in the iframe of the preview, better get my parent
  if (!ms.length && !preview_frame.length) {
    // TODO check for $('body.iframe') might make it more reliable
    w = window.parent;
  }
  if (popup_window.length || elastic_popup_window.length) {
    /*
     * i run in a popup window (message to be shown in popup can be configured
     * by the user)
     * theoretically we should point at window.opener, but this is unreliable,
     * reload of the page in popup window makes the relation between parent+popup
     * potentially go away.
     * php injects the needed global variables into the popup window html code
     * Problem: changes of labels are not known to the main window.
     * */
    w = window;
  }
  ms = w.document.getElementById("mainscreen");
  if (!ms) {
    ms = w.document.getElementById("messagelist-content");
    if (!ms) {
      // likely roundcube elastic skin
      if (elastic_popup_window.length) {
        return w;
      }
      console.log("mainscreen still not found");
      return null;
    }
  }
  return w;
};

rcm_tb_label_global = function (var_name) {
  return rcm_tb_label_find_main_window()[var_name];
};

rcm_tb_label_global_set = function (var_name, value) {
  return (rcm_tb_label_find_main_window()[var_name] = value);
};

escape_jquery_selector = function (str) {
  return str.replace("&", "\\&");
};

i18n_label = function (label_name) {
  let format = label_name => {
    words = label_name.split("_");
    words = words.map(word => word[0].toUpperCase() + word.slice(1).toLowerCase());
    return words.join(" ");
  };
  if (Object.keys(rcmail.env.imap_labels).includes(label_name)) {
    return format(label_name); // on reçoit directement les flags du message sans après-traitement
  } else { // ça serait peut-être l'occasion d'en faire
    return label_name
  }
};

rcm_tb_label_flag_toggle = function (flag_uids, toggle_label_no, onoff) {
  var headers_table, label_box, labels_for_message, pos, preview_frame;
  if (!flag_uids.length) {
    return;
  }
  preview_frame = $("#messagecontframe");
  labels_for_message = rcm_tb_label_global("tb_labels_for_message");
  // preview frame exists, try to find elements in preview iframe
  if (preview_frame.length) {
    headers_table = preview_frame
      .contents()
      .find("table.headers-table,#message-header");
    label_box = preview_frame.contents().find("#labelbox");
  } else {
    headers_table = $("table.headers-table,#message-header");
    label_box = $("#labelbox");
  }
  if (!rcmail.message_list && !headers_table.length) {
    return;
  }
  // for message preview, or single message view
  if (headers_table.length) {
    if (onoff === true) {
      label_box
        .find("span.box_tb_label_" + escape_jquery_selector(toggle_label_no))
        .remove();
      label_box.append(
        '<span class="box_tb_label_' +
          toggle_label_no + // on travaille en interne avec les noms majuscule des tags
          '">' +
          i18n_label(toggle_label_no) +
          "</span>"
      );
      // add to flag list
      labels_for_message.push(toggle_label_no);
    } else {
        label_box
        .find("span.box_tb_label_" + escape_jquery_selector(toggle_label_no))
        .remove();
      pos = jQuery.inArray(toggle_label_no, labels_for_message);
      if (pos > -1) {
        labels_for_message.splice(pos, 1);
      }
    }
    // make list unique
    labels_for_message = jQuery.grep(labels_for_message, function (v, k) {
      return jQuery.inArray(v, labels_for_message) === k;
    });
    rcm_tb_label_global_set("tb_labels_for_message", labels_for_message);
  }
  if (!rcmail.env.messages) {
    // exit function when in detail mode. when preview is active keep going
    return;
  }
  jQuery.each(flag_uids, function (idx, uid) {
    var message, row, rowobj, spanobj;
    message = rcmail.env.messages[uid];
    row = rcmail.message_list.rows[uid];
    if (onoff === true) {
      // check if label is already set
      if (jQuery.inArray(toggle_label_no, message.flags.tb_labels) > -1) {
        return;
      }
      // add colors
      rowobj = $(row.obj);
      spanobj = rowobj.find("td.subject span.tb_label_dots");
      spanobj.append(
        '<span class="tb_label_badges badge ' +
          toggle_label_no +
          '">' +
          i18n_label(toggle_label_no) +
          "</span>"
      );
      // add to flags list
      message.flags.tb_labels.push(toggle_label_no);
    } else {
      // remove colors
      rowobj = $(row.obj);
      rowobj
        .find(
          "td.subject span.tb_label_dots span.tb_label_badges." +
            toggle_label_no
        )
        .remove();
      // remove from flag list
      pos = jQuery.inArray(toggle_label_no, message.flags.tb_labels);
      if (pos > -1) {
        message.flags.tb_labels.splice(pos, 1);
      }
    }
  });
};

rcm_tb_label_flag_msgs = function (flag_uids, toggle_label_no) {
  rcm_tb_label_flag_toggle(flag_uids, toggle_label_no, true);
};

rcm_tb_label_unflag_msgs = function (unflag_uids, toggle_label_no) {
  rcm_tb_label_flag_toggle(unflag_uids, toggle_label_no, false);
};

// helper function to get selected/active messages
rcm_tb_label_get_selection = function () {
  var selection;
  selection = rcmail.message_list ? rcmail.message_list.get_selection() : [];
  if (selection.length === 0 && rcmail.env.uid) {
    selection = [rcmail.env.uid];
  }
  return selection;
};

// maps signature of RC hooks
rcm_tb_label_menuclick = function (labelname, obj, ev) {
  return rcm_tb_label_toggle(labelname);
};

// actually toggle the label for the selected messages
rcm_tb_label_toggle = function (toggle_label) {
  var selection, toggle_labels;
  selection = rcm_tb_label_get_selection();
  if (!selection.length) {
    return;
  }
  toggle_labels.forEach(function (v, k, arr) {
    var first_message,
      first_toggle_mode,
      flag_uids,
      lock,
      str_flag_uids,
      str_unflag_uids,
      toggle_label_no,
      unflag_uids;
    toggle_label = v;
    toggle_label_no = toggle_label;
    /* compile list of unflag and flag msgs and then send command
       Thunderbird modifies multiple message flags like it did the first in the selection
       e.g. first message has flag1, you click flag1, every message select loses flag1,
            the ones not having flag1 don't get it!
    */
    first_toggle_mode = "on";
    if (rcmail.env.messages) {
      first_message = rcmail.env.messages[selection[0]];
      if (
        first_message.flags &&
        jQuery.inArray(toggle_label_no, first_message.flags.tb_labels) >= 0
      ) {
        first_toggle_mode = "off";
      } else {
        first_toggle_mode = "on";
      }
    } else {
      // flag already set?
      if (
        jQuery.inArray(
          toggle_label_no,
          rcm_tb_label_global("tb_labels_for_message")
        ) >= 0
      ) {
        first_toggle_mode = "off";
      }
    }
    flag_uids = [];
    unflag_uids = [];
    jQuery.each(selection, function (idx, uid) {
      var message;
      if (!rcmail.env.messages) {
        if (first_toggle_mode === "on") {
          flag_uids.push(uid);
        } else {
          unflag_uids.push(uid);
        }
        if (unset_all && unflag_uids.length === 0) {
          unflag_uids.push(uid);
        }
        return;
      }
      message = rcmail.env.messages[uid];
      if (
        message.flags &&
        jQuery.inArray(toggle_label_no, message.flags.tb_labels) >= 0
      ) {
        if (first_toggle_mode === "off") {
          unflag_uids.push(uid);
        }
      } else {
        if (first_toggle_mode === "on") {
          flag_uids.push(uid);
        }
      }
    });
    if (unset_all) {
      flag_uids = [];
    }
    // skip sending flags to backend that are not set anywhere
    if (flag_uids.length === 0 && unflag_uids.length === 0) {
      return;
    }
    str_flag_uids = flag_uids.join(",");
    str_unflag_uids = unflag_uids.join(",");
    lock = rcmail.set_busy(true, "loading");
    // call PHP set_flags to set the flags in IMAP server
    rcmail.http_request(
      "plugin.thunderbird_labels.set_flags",
      "_flag_uids=" +
        str_flag_uids +
        "&_unflag_uids=" +
        str_unflag_uids +
        "&_mbox=" +
        urlencode(rcmail.env.mailbox) +
        "&_toggle_label=" +
        toggle_label,
      lock
    );
    // remove/add classes and tb labels from messages in JS
    rcm_tb_label_flag_msgs(flag_uids, toggle_label_no);
    rcm_tb_label_unflag_msgs(unflag_uids, toggle_label_no);
  });
};

rcmail_ctxm_label = function (command, el, pos) {
  // my code works only on selected rows, contextmenu also on unselected
  // so if no selection is available, use the uid set by contextmenu plugin
  var cur_a, selection;
  selection = rcmail.message_list ? rcmail.message_list.get_selection() : [];
  if (!selection.length && !rcmail.env.uid) {
    return;
  }
  if (!selection.length && rcmail.env.uid) {
    rcmail.message_list.select_row(rcmail.env.uid);
  }
  cur_a = $("#tb-label-menu a." + rcmail.tb_label_no);
  if (cur_a) {
    cur_a.click();
  }
};

rcmail_ctxm_label_set = function (which) {
  // hack for my contextmenu submenu to propagate the selected label-no
  rcmail.tb_label_no = which;
};

// -- Shows the roundcube UI submenu of thunderbird labels
rcm_tb_label_submenu = function (p, obj, ev) {
  if (typeof rcmail_ui === "undefined") {
    window.rcmail_ui = UI;
  }
  // elastic skin does not have show_popup
  if (!rcmail_ui.show_popup) {
    return;
  }
  // create sensible popup, using roundcubes internals
  if (!rcmail_ui.check_tb_popup()) {
    rcmail_ui.tb_label_popup_add();
  }
  // skin larry vs classic
  if (typeof rcmail_ui.show_popupmenu === "undefined") {
    return;
  } else {
    rcmail_ui.show_popupmenu("tb-label-menu", ev); // classic
  }
  return false;
};
