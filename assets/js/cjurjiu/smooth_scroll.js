$.extend($.easing,
  {
    def: 'easeOutQuad',
    easeInOutExpo: function (x, t, b, c, d) {
      if (t == 0) return b;
      if (t == d) return b + c;
      if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
      return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
    }
  });

(function ($) {

  var settings;
  var disableScrollFn = false;
  var navItems;
  var navs = {}, sections = {};

  $.fn.navScroller = function (options) {
    settings = $.extend({
      // scrollToOffset: 170,
      // scrollSpeed: 800,
      activateParentNode: true,
    }, options);
    navItems = this;

    //attach click listeners
    navItems.on('click', function (event) {
      event.preventDefault();
      var navID = $(this).attr("href").substring(1);
      // disableScrollFn = true;
      activateNav(navID);
      populateDestinations(); //recalculate these!
      // $('html,body').animate({scrollTop: sections[navID] - settings.scrollToOffset},
      //       settings.scrollSpeed, "easeInOutExpo", function(){
      //           disableScrollFn = false;
      //       }
      //   );
    });

    //populate lookup of clickable elements and destination sections
    populateDestinations(); //should also be run on browser resize, btw

    // setup scroll listener
    $(document).scroll(function () {
      if (disableScrollFn) {
        return;
      }
      var page_height = $(window).height();
      var pos = $(this).scrollTop();
      for (i in sections) {
        if ((pos + settings.scrollToOffset >= sections[i]) && sections[i] < pos + page_height) {
          activateNav(i);
        }
      }
    });

    // setup scroll listener
    $(document).scroll(function () {

      var element = document.querySelector(".header");
      var className = element.className;
      var offsetTop = element.offsetTop + window.pageYOffset;
      if (offsetTop > 50) {
        if (className.indexOf("header-collapsed") < 0) {
          element.className += " header-collapsed";
        }
      } else if (className.indexOf("header-collapsed") > 0) {
        element.className = element.className.replace(" header-collapsed", "");
      }

      console.log("new element.classname:" + element.className);
    });

  };

  function removeClass(classname, element) {
    var cn = element.className;
    var rxp = new RegExp("s?b" + classname + "b", "g");
    cn = cn.replace(rxp, '');
    element.className = cn;
  }

  function populateDestinations() {
    navItems.each(function () {
      var scrollID = $(this).attr('href').substring(1);
      var hrefString = $(this).attr('href');
      navs[scrollID] = (settings.activateParentNode) ? this.parentNode : this;
      var offset = sections[scrollID] = $(document.getElementById(scrollID)).offset();
      if (offset != null) {
        sections[scrollID] = offset.top;
      } else {
        console.warn("failed to find offset of href:" + hrefString);
      }
    });
  }

  function activateNav(navID) {
    for (nav in navs) {
      $(navs[nav]).removeClass('active');
    }
    $(navs[navID]).addClass('active');
  }
})(jQuery);


$(document).ready(function () {

  $('nav li a:not(.absolute)').navScroller();

  //section divider icon click gently scrolls to reveal the section
  $(".sectiondivider").on('click', function (event) {
    $('html,body').animate({scrollTop: $(event.target.parentNode).offset().top - 50}, 400, "linear");
  });

  // links going to other sections nicely scroll
  $(".container a").each(function () {
    if ($(this).attr("href").charAt(0) == '#') {
      $(this).on('click', function (event) {
        event.preventDefault();
        var target = $(event.target).closest("a");
        var targetHight = $(target.attr("href")).offset().top
        $('html,body').animate({scrollTop: targetHight - 170}, 800, "easeInOutExpo");
      });
    }
  });

});