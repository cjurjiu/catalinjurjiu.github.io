/*
GreedyNav.js - http://lukejacksonn.com/actuate
Licensed under the MIT license - http://opensource.org/licenses/MIT
Copyright (c) 2015 Luke Jackson
*/

$(function() {

  var $nav = $("#site-navbar");
  var $btn = $("#site-navbar button");
  var $vlinks = $("#site-navbar .links");
  var $hlinks = $("#site-navbar .hidden-links");
  var $lgItem =  $(".header__menu-item--lg");

  var numOfItems = 0;
  var totalSpace = 0;
  var closingTime = 1000;
  var breaks = [];

  // Get initial state
  $vlinks.children().outerWidth(function(i, w) {
    totalSpace += w;
    numOfItems += 1;
    breaks.push(totalSpace);
  });
  check();
  var availableSpace, numOfVisibleItems, requiredSpace, timer;

/**
 * @return {undefined}
 */
// function updateNav() {
function check() {
  var mainItemWidth  = $lgItem.outerWidth();
  var widthWButton = $nav.width() - $btn.width() - mainItemWidth - 10;
  var availableSpace = $btn.hasClass("hidden") ? $nav.width() - mainItemWidth : widthWButton;
  var spaceReqForFullNavbar = $vlinks.width();

  if(availableSpace <= 0){
    //return if the availalbe space is less than 0, to prevent infinite loop
    return;
  }

  if (spaceReqForFullNavbar >= availableSpace) {
    breaks.push(spaceReqForFullNavbar);
    $vlinks.children().last().prependTo($hlinks);
    if ($btn.hasClass("hidden")) {
      $btn.removeClass("hidden");
    }
  } else {
    if (availableSpace > breaks[breaks.length - 1]) {
      $hlinks.children().first().appendTo($vlinks);
      breaks.pop();
      check();
    }
    if (breaks.length < 1) {
      $btn.addClass("hidden");
      $hlinks.addClass("hidden");
    }
  }

  spaceReqForFullNavbar = $vlinks.width();
  $btn.attr("count", breaks.length);
  if (spaceReqForFullNavbar >= availableSpace) {
    check();
  }
}

  // Window listeners
  $(window).resize(function() {
    check();
    console.log("check")
  });

  $btn.on('click', function() {
    if($btn.hasClass('close')){
      closeCollapsedItems();
    } else {
      openCollapsedItems();
    }
    clearTimeout(timer);
  });

  $hlinks.on('mouseleave', function() {
    // Mouse has left, start the timer
    timer = setTimeout(function() {
      closeCollapsedItems();
    }, closingTime);
  }).on('mouseenter', function() {
    // Mouse is back, cancel the timer
    clearTimeout(timer);
  })

//clear dropdown when scrolling
$(window).scroll(function() {
     if($btn.hasClass('close')){
       closeCollapsedItems();
       clearTimeout(timer);
     }
})

 function openCollapsedItems(){
    $hlinks.removeClass('hidden');
    $btn.addClass('close');
 }

 function closeCollapsedItems(){
    $hlinks.addClass('hidden');
    $btn.removeClass('close');
 }

});