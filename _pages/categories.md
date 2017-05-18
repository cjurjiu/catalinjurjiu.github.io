---
layout: singlepage-archive
permalink: /categories/
title: 'Android developer, tech passionate'
header:
  overlay_image: ./assets/images/plane-over-clouds.jpg
author_profile: true
---
{% include group-by-array collection=site.posts field="categories" %}

{% for category in group_names %}
  {% assign posts = group_items[forloop.index0] %}
  <h2 id="{{ category | slugify }}" class="archive__subtitle">{{ category }}</h2>
  {% for post in posts %}
    {% include archive-single.html %}
  {% endfor %}
{% endfor %}