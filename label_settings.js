COLORS = {
    "blue": "Bleu",
    "indigo": "Indigo",
    "purple": "Violet",
    "pink": "Rose",
    "red": "Rouge",
    "orange": "Orange",
    "yellow": "Jaune",
    "teal": "Sarcelle",
    "cyan": "Cyan",
    "gray": "Gris"
}

LABEL_TEMPLATE = `<tr class="form-group row">
  <td class="title col-sm-6">{human_readable}</td>
  <td class="col-sm-6">
    <div class="input-group">
      <select name="label_{internal}" class="label_color_selector form-control custom-select pretty-select">
        <option value="blue">Bleu</option>
        <option value="indigo">Indigo</option>
        <option value="purple">Violet</option>
        <option value="pink">Rose</option>
        <option value="red">Rouge</option>
        <option value="orange">Orange</option>
        <option value="yellow">Jaune</option>
        <option value="teal">Sarcelle</option>
        <option value="cyan">Cyan</option>
        <option value="gray">Gris</option>
      </select>
      <button class="delete_button btn btn-secondary" type="button">Supprimer</button>
    </div>
  </td>
</tr>`;

function option_coloring() {
    for (const [color, human_readable] of Object.entries(COLORS)) {
        $(`.popover.select-menu .listing a:contains("${human_readable}")`).css("color", `var(--${color})`);
    }
}

function update_cover_color() {
    let select = document.activeElement;
    if (select.tagName != "SELECT") {
        return;
    }
    select.style.color = `var(--${Object.keys(COLORS)[select.selectedIndex]})`;
}

function create_label(raw_name) {
    let label_name = raw_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(' ', '_').toUpperCase(); 
    let new_color = '';
    let root_form_controls = $('.formcontent tbody')[0].childNodes;
    $(root_form_controls[root_form_controls.length - 2]).after(LABEL_TEMPLATE
        .replace('{internal}', label_name)
        .replace('{human_readable}', raw_name));
    $('form').trigger('submit');
}

function delete_label() {
    $(this).parent().parent().parent().remove();
}

$(() => {
    $('.label_color_selector').on('change', update_cover_color);
    $('.label_color_selector').on('click', option_coloring);
    $('#add_label_button').on('click', () => create_label($('#add_label_field').val()));
    $('.delete_button').on('click', delete_label);

    $('#preferences-frame').on('load', () => {
        let iframe_contents = $('#preferences-frame').contents();
        let matches = iframe_contents.find('fieldset');
        if (matches.length == 0 || matches[0].className != 'tb_label') {
            return;
        }

        iframe_contents.find('.label_color_selector').each(function() {
            $(this).css('color', `var(--${Object.keys(COLORS)[this.selectedIndex]})`);
        });

    });
});