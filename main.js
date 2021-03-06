var bg  = chrome.extension.getBackgroundPage()
//initialising app and attaching stuff
angular.module("liveStocksPortfolio", [])
    .filter("sortBy", sortBy)
    .controller("bodyCtrl",["$scope", "$window", bodyCtrl])
    .directive("colorUp", colorUp)
    .directive("contenteditable", contentEditable)

function bodyCtrl($scope, $window) {
    $window.onunload = beforeUnload

    $scope.list     = bg.stockData
    $scope.symbol   = ""    //symbol in the input box

    $scope.cost     = localStorage.cost     ? JSON.parse(localStorage.cost)     : {}
    $scope.target   = localStorage.target   ? JSON.parse(localStorage.target)   : {}
    $scope.stoploss = localStorage.stoploss ? JSON.parse(localStorage.stoploss) : {}
    $scope.shares   = localStorage.shares   ? JSON.parse(localStorage.shares)   : {}

    $scope.from     = localStorage.from     ? parseInt(localStorage.from)       : 0
    $scope.to       = localStorage.to       ? parseInt(localStorage.to)         : 24
    $scope.interval = localStorage.interval ? parseInt(localStorage.interval)   : 10

    $scope.$watch("from", function(newVal, oldVal) { localStorage.from = newVal })
    $scope.$watch("to", function(newVal, oldVal) { localStorage.to = newVal })
    $scope.$watch("interval", function(newVal, oldVal) { localStorage.interval = newVal ? newVal : 10 })

    //watches for updating bg page Variables instantly
    //using watch with 3rd parameter as true for deep checking of object
    $scope.$watch("target", function(newVal, oldVal) { bg.target = newVal }, true)
    $scope.$watch("stoploss", function(newVal, oldVal) { bg.stoploss = newVal }, true)
    //individuals
    $scope.investment   = investment
    $scope.value        = value
    $scope.ROI          = ROI
    $scope.percentROI   = percentROI
    //totals
    $scope.tInvestment  = tInvestment
    $scope.tValue       = tValue
    $scope.tROI         = tROI
    $scope.tPercentROI  = tPercentROI

    $scope.addSymbol    = addSymbol
    $scope.delRow       = delRow

    //initial Sort by symbol at application start
    $scope.sortKey      = localStorage.sortKey ? localStorage.sortKey : "t"
    $scope.reverse      = localStorage.reverse === "true" ? true : false

    $scope.toggleSort   = toggleSort
    $scope.redOrGreen   = redOrGreen

    function redOrGreen(ele) {
        if ($scope.target[ele.id] && (deComma(ele.l) > deComma($scope.target[ele.id]))) {
            return "tGreen"
        }
        else if ($scope.stoploss[ele.id] && (deComma(ele.l) < deComma($scope.stoploss[ele.id]))) {
            return "sRed"
        } else {
            return ""
        }
    }

    function toggleSort(sortKey) {
        $scope.reverse = ($scope.sortKey === sortKey) ? !$scope.reverse : false
        $scope.sortKey = sortKey
    }

    function investment(ele) {
        var invest = $scope.shares[ele.id] && $scope.cost[ele.id]  ? $scope.cost[ele.id] * $scope.shares[ele.id] : null
        return invest
    }

    function value(ele) {
        var val = $scope.shares[ele.id] ? deComma(ele.l) * $scope.shares[ele.id] : null
        return val
    }

    function ROI(ele) {
        var ROI = deComma($scope.value(ele)) - deComma($scope.investment(ele))
        ROI = $scope.shares[ele.id] && $scope.cost[ele.id] ? ROI : null
        return ROI
    }

    function percentROI(ele) {
        var percentROI = deComma($scope.ROI(ele)) * 100 / deComma($scope.investment(ele))
        percentROI = ($scope.shares[ele.id] && $scope.cost[ele.id]) ? percentROI : null
        return percentROI
    }

    function tInvestment() {
        var total = 0
        $scope.list.forEach(function (el, i){ total = total + $scope.investment(el) })
        return total
    }

    function tValue() {
        var total = 0
        $scope.list.forEach(function (el, i){ total = total + $scope.value(el) })
        return total
    }

    function tROI() {
        var total = 0
        $scope.list.forEach(function (el, i){ total = total + $scope.ROI(el) })
        return total
    }

    function tPercentROI() {
        var total = 0
        total = $scope.tROI() * 100 / $scope.tInvestment()
        return total ? total: null
    }

    function delRow(ele) {
        $scope.list.splice($scope.list.indexOf(ele), 1)
        delete bg.symbols[ele.id]
        delete $scope.shares[ele.id]
        delete $scope.cost[ele.id]
        delete $scope.target[ele.id]
        delete $scope.stoploss[ele.id]
        saveLocal()
    }

    function beforeUnload() {
        chrome.extension.sendRequest({action: "getData", interval: 60})
        bg.symbols = {}
        $scope.list.forEach(function (el, i) { bg.symbols[el.id] = el.e + ":" + el.t })
        saveLocal()
    }

    function saveLocal() {
        //saving prefs in localStorage
        if ($scope.list.length === 0) {
            localStorage.removeItem("symbols")
            localStorage.removeItem("cost")
            localStorage.removeItem("target")
            localStorage.removeItem("stoploss")
            localStorage.removeItem("shares")
            return
        }
        localStorage.symbols = JSON.stringify(bg.symbols)
        localStorage.cost    = JSON.stringify($scope.cost)
        localStorage.shares  = JSON.stringify($scope.shares)
        localStorage.stoploss= JSON.stringify($scope.stoploss)
        localStorage.target  = JSON.stringify($scope.target)
        //saving the sortDetails
        localStorage.sortKey = $scope.sortKey
        localStorage.reverse = JSON.stringify($scope.reverse)
    }
}

function addSymbol(symbol) {
    var howManyRows = $('tbody tr').length;
    bg.inputSyms = bg.inputSyms.concat(symbol)
    chrome.extension.sendRequest({action: "getData", interval: 5});

    $("#symbols").attr('placeholder', chrome.i18n.getMessage("symbolSearching"));
    setTimeout(function() {
        $("#symbols").attr('placeholder', chrome.i18n.getMessage("searchString"));
        var howManyNew = $('tbody tr').length;
        if (howManyNew === howManyRows) {
            $("#symbols").attr('placeholder', chrome.i18n.getMessage("symbolNotFound"));
        } else {
            $("a[data-message='undoAddStock']").click();
        }
    }, 500);
}

function sortBy() {
    return sortFunc
    // arr would be the $scope.list
    function sortFunc (arr, sortKey, reverse, scope) {
        // Making a copy of the Original Array to avoid an Infinite loop ($digest() has been
        // triggered 10 times.Aborting! Error). Because Otherwise the sort function will alter
        // the Orignial Object ($scope.list = arr) (and then returns its sorted copy) which would cause
        // the trigger of $watches and $digest infinitely.
        var min     = Number.MIN_SAFE_INTEGER
        var arrCopy = arr.slice(0)
            // for symbol
        if (sortKey === "t") {
            var sorted = arrCopy.sort(function (a,b) { return a[sortKey] > b[sortKey] })
        }    // for price, change and change percentage
        else if ("lccp".search(sortKey) > -1) {
            var sorted = arrCopy.sort(function (a,b) { return deComma(a[sortKey]) - deComma(b[sortKey]) })
        }     // for target, stoploss, cost & shares
        else if ("targetstoplosscostshares".search(sortKey) > -1) { //
            var sorted = arrCopy.sort(function (a,b) { return (scope[sortKey][a.id] || min) - (scope[sortKey][b.id] || min) })
        }    // for price, change and change percentage
        else if ("investmentvalueROIpROI".search(sortKey > -1)) {
            var symMap = {}
            var ids    = $("td.ids")
            $("td[name='" + sortKey + "']").each(function (i, ele) { symMap[ids[i].innerText] = ele.innerText })
            var sorted = arrCopy.sort(function (a,b) { return (deComma(symMap[a.id]) || min) - (deComma(symMap[b.id]) || min) })
        }
        return reverse ? sorted.reverse() : sorted
    }
}

function colorUp() {
  return {
      restrict: "A",
      link: linkFunc
  }

  function linkFunc (scope, element, attributes) {
    //adding an event handler to see elements' value changes
    element.on("DOMSubtreeModified", onValChange)

    function onValChange () {
      var eleVal = deComma(element.text())
      var color  = (eleVal > 0) ? " green": (eleVal < 0) ? " red": ""
      element.closest("td").attr("class", "ng-binding" + color)
    }
  }
}

function contentEditable() {
  return {
      restrict: "A",
      require:"ngModel",
      link: linkFunc
  }

  function linkFunc(scope, element, attributes, ngModelController) {

      //for Keypress event for enter key only
      element.on("keypress", function (key) {
        if (key.keyCode === 13) {
          key.preventDefault()
          element[0].blur()
        }
      })
      //triggering update of the ViewModel
      element.on("change blur", function () {
         scope.$apply(updateViewModel)
      })

      function updateViewModel() {
          var htmlValue = element.text()
          ngModelController.$setViewValue(htmlValue)
      }
      //triggering update of html
      ngModelController.$render = updateHtmlValue

      function updateHtmlValue() {
          var viewModelValue = ngModelController.$viewValue
          // As undefined value won't update the html (leaving it with the current value),
          // so I am using empty string instead.
          viewModelValue = viewModelValue ? viewModelValue : ""
          element.text(viewModelValue)
      }

  }
}

//requesting data after loading the angular stuff
chrome.extension.sendRequest({action: "getData", interval: parseInt(localStorage.interval)})

chrome.extension.onRequest.addListener(function (request) {
  var scope = angular.element($('[ng-app]')).scope()    //thats how we can refer App Scope outside the App Scope or Controller

  if (request.action === "updateView") {

      scope.$apply(function () { scope.list = bg.stockData })
      scope.list.forEach(function (el, i) { bg.symbols[el.id] = el.e + ":" + el.t })

  } else if (request.action === "updateTS") {

      scope.$apply(function () {
         scope.target   = bg.target
         scope.stoploss = bg.stoploss
      })

  }
})

function print() { console.log.apply(console, arguments) }
function deComma(text) { return (text ? Number((text+"").replace(/,/g, "")) : "") }

$("#symbols").keyup(function() {
    var $this = $(this);
    var value = $this.val();

    var symbolsUrl = "https://www.google.com/finance/match?matchtype=matchall&ei=oJApWZnmBYeNUsSLnsgM&q=" + value;
    $.getJSON(symbolsUrl, {
        format: "json"
    }).done(function(data) {
        if (!jQuery.isEmptyObject(data)) {
            $("#searchSymbols").remove();
            $this.after('<div id="searchSymbols"></div>');
            jQuery.each(data.matches, function(index, item) {
                if (item.t !== '') {
                    $("#searchSymbols").append("<a class='symbols' data-symbol='" + item.e + ":" + item.t +  "'>" + item.e + ":" + item.t + ": " + item.n +"</a>");
                }
            });
        }
    });
});

//something are done without angular and with normal jQuery and Javascript
$("a[data-message='addStock']").click(function() {
    $("#symbols").removeAttr("style").focus();
    $("a[data-message='undoAddStock']").show();
    $("a[data-message='options']").hide();
    $("a[data-message='websites']").hide();
    $(this).hide();
});
$("a[data-message='undoAddStock']").click(function() {
    $("#symbols").val("").css("display", "none");
    $("a[data-message='addStock']").show();
    $("a[data-message='options']").show();
    $("a[data-message='websites']").show();
    $('#searchSymbols').remove();
    $(this).hide();
});

$("a[data-message='options']").click(function() {
    $(".options").removeAttr("style");
    $("a[data-message='addStock']").hide();
    $("a[data-message='undoOptions']").show();
    $("a[data-message='websites']").hide();
    $(this).hide();
});
$("a[data-message='undoOptions']").click(function() {
    $(".options").css("display", "none");
    $("a[data-message='addStock']").show();
    $("a[data-message='options']").show();
    $("a[data-message='websites']").show();
    $(this).hide();
});

$("a[data-message='websites']").click(function() {
    $(".websites").css("display", "block");
    $("a[data-message='addStock']").hide();
    $("a[data-message='options']").hide();
    $("a[data-message='undoWebsites']").show();
    $(this).hide();
});
$("a[data-message='undoWebsites']").click(function() {
    $(".websites").css("display", "none");
    $("a[data-message='addStock']").show();
    $("a[data-message='options']").show();
    $("a[data-message='websites']").show();
    $(this).hide();
});

$("body").on("click", ".symbols", function() {
    var symbol = $(this).attr('data-symbol');
    addSymbol(symbol);
});
