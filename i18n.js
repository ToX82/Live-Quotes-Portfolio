/*
* Html strings
*/
var $strings = $('*[data-message]');
$strings.each(function() {
    var $this = $(this);
    var messageName = $this.attr('data-message');
    var text = $this.html();
    var translated = chrome.i18n.getMessage(messageName);
    if (translated !== '' && translated !== undefined) {
        $this.html(translated);
    }
});

/*
* Input placeholders
*/
var $placeholders = $('*[data-placeholder]');
$placeholders.each(function() {
    var $this = $(this);
    var placeholderName = $this.attr('data-placeholder');
    var text = $this.attr('placeholder');
    var translated = chrome.i18n.getMessage(placeholderName);
    if (translated !== '' && translated !== undefined) {
        $this.attr('placeholder', translated);
    }
});
