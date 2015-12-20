var bg  = chrome.extension.getBackgroundPage() 
//initialising app and attaching stuff
angular.module("liveQuotesPortfolio", [])
	.controller("bodyCtrl", bodyCtrl)
	.directive("colorUp", colorUp)

function bodyCtrl($scope, $window, $filter) {
	$window.onunload = beforeUnload

	$scope.list 	= bg.stockData
	$scope.symbol 	= ""	//symbol in the input box
	
	$scope.cost 	= localStorage.cost 	? JSON.parse(localStorage.cost) 	: {}
	$scope.target 	= localStorage.target 	? JSON.parse(localStorage.target) 	: {}
	$scope.stoploss = localStorage.stoploss ? JSON.parse(localStorage.stoploss) : {}
	$scope.shares 	= localStorage.shares 	? JSON.parse(localStorage.shares) 	: {}
	
	$scope.investment 	= investment
	$scope.value		= value
	$scope.ROI 			= ROI
	$scope.percentROI 	= percentROI
	$scope.tInvestment 	= tInvestment
	$scope.tValue		= tValue
	$scope.tROI			= tROI
	$scope.tPercentROI	= tPercentROI
	
	$scope.addSymbol 	= addSymbol
	$scope.delRow 		= delRow	

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
		percentROI = $scope.shares[ele.id] && $scope.cost[ele.id] ? percentROI : null
		return percentROI
	}

	function tInvestment() {
		var total = 0
		$scope.list.forEach(function (el, i){ total = total + $scope.investment(el)	})
		return total
	}

	function tValue() {
		var total = 0
		$scope.list.forEach(function (el, i){ total = total + $scope.value(el)	})
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
		return (total ? total : "")
	}

	function addSymbol($event) {
		if ($event.keyCode !== 13) { return }
		var syms = $scope.symbol.toUpperCase().replace(/ /g, "").split(",")
		//emptying the input box
		$scope.symbol = ""
		syms = syms.filter(function (el, i) { return el.trim() !== "" && syms.indexOf(el) === i })
		bg.inputSyms = bg.inputSyms.concat(syms)
		chrome.extension.sendRequest({action: "getData", interval: 5})
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
		localStorage.symbols 	= JSON.stringify(bg.symbols)
		localStorage.cost 		= JSON.stringify($scope.cost)
		localStorage.shares 	= JSON.stringify($scope.shares)
		localStorage.stoploss 	= JSON.stringify($scope.stoploss)
		localStorage.target 	= JSON.stringify($scope.target)
	}

}

function colorUp(){
	return {
		restrict: "A",
		link: linkFunc
	}

	function linkFunc (scope, element, attributes) {
		element.on("DOMSubtreeModified", onValChange)

		function onValChange () {
			var eleVal = deComma(element.text())
			print(eleVal)
			var color  = (eleVal > 0) ? "green"
									  : (eleVal < 0) ? "red"
									  				 : ""
			element.attr("class", "ng-binding " + color)
		}
	}
}

//requesting data after loading the angular stuff
chrome.extension.sendRequest({action: "getData", interval: 60})

chrome.extension.onRequest.addListener(function (request) {
	if (request.action === "updateView") {
		var scope = angular.element($('[ng-app]')).scope()	//thats how we can refer App Scope outside the App Scope or Controller
		scope.$apply(function () { scope.list = bg.stockData })
		scope.list.forEach(function (el, i) { bg.symbols[el.id] = el.e + ":" + el.t })
	}
})

function print() { console.log.apply(console, arguments) }
function deComma(text) { return (text ? (text+"").replace(/,/g, "") : "") }

function getValues(obj) {
	var val = Object.keys(obj).map(function (key) { return obj[key] })
	return val
}