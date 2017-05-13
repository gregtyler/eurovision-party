const $app = $('#app');
var db = {};

function $(sel) {
  return document.querySelector(sel);
}

function $$(sel) {
  return document.querySelectorAll(sel);
}

function tmpl(viewID, data){
  var str = $('#view-' + viewID).innerHTML
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

  localStorage.setItem('view', viewID);

  // Figure out if we're getting a template, or if we need to
  // load the template - and be sure to cache the result.
  var fn = !/\W/.test(str) ?
    cache[str] = cache[str] ||
      tmpl(document.getElementById(str).innerHTML) :

    // Generate a reusable function that will serve as a template
    // generator (and which will be cached).
    new Function("obj",
      "var p=[],print=function(){p.push.apply(p,arguments);};" +

      // Introduce the data as local variables using with(){}
      "with(obj){p.push('" +

      // Convert the template into pure JavaScript
      str
      .replace(/[\r\t\n]/g, " ")
        .split("<%").join("\t")
        .replace(/((^|%>)[^\t]*)'/g, "$1\r")
        .replace(/\t=(.*?)%>/g, "',$1,'")
        .split("\t").join("');")
        .split("%>").join("p.push('")
        .split("\r").join("\\'")
    + "');}return p.join('');");

  // Provide some basic currying to the user
  return data ? fn( data ) : fn;
}

function save() {
  // Save votes
  var scores = db.songs.map(song => {return {
    code: song.code,
    score: song.score || 0,
    points: song.points || 0
  }});
  localStorage.setItem('scores', JSON.stringify(scores));
}

function view(viewID) {
  $app.innerHTML = tmpl(viewID, db);

  $$('[data-link]').forEach($link => {
    $link.addEventListener('click', (event) => {
      event.preventDefault();
      view($link.getAttribute('data-link'))
    });
  });

  if (viewID === 'login') {
    $('[data-js="login-button"]').addEventListener('click', function() {
      var name = $('[data-js="login-name"]').value;

      if (name.length <= 2) return alert('Name must be at least 3 characters');

      localStorage.setItem('name', name.toUpperCase());
      db.name = localStorage.getItem('name');

      view('judge');
    });
  } else if (viewID === 'judge') {
    $$('[data-js="judge"]').forEach($btn => {
      $btn.addEventListener('click', function() {
        var countryCode = this.closest('[data-song]').getAttribute('data-song');
        var score = parseInt(this.getAttribute('data-score'), 10);

        // Set vote
        db.songs
          .find(song => song.code === countryCode)
          .score = score;

        save();

        view('judge');
      })
    });
  } else if (viewID === 'vote') {
    // Set the select box values
    db.songs.forEach(song => {
      if (song.points) {
        console.log(song);
        $('[data-points="' + song.points + '"] > [value="' + song.code + '"]').selected = true;
      }
    });

    // Save when points are set
    $$('[data-points]').forEach($points => {
      $points.addEventListener('change', function() {
        var points = parseInt(this.getAttribute('data-points'), 10);
        var countryCode = this.value;

        // Set points
        db.songs
          .find(song => song.code === countryCode)
          .points = points;

        save();
      });
    });
  }
}


fetch('js/data.json')
  .then(response => response.json())
  .then(data => {
    db.songs = data.songs;

    var scores = localStorage.getItem('scores');
    if (scores) {
      scores = JSON.parse(scores);
      scores.forEach(function(userScore) {
        var song = db.songs
          .find(song => song.code === userScore.code);
        song.score = userScore.score
        song.points = userScore.points;
      });
    }

    if (localStorage.getItem('name')) {
      db.name = localStorage.getItem('name');
      view(localStorage.getItem('view') || 'judge');
    } else {
      view('login');
    }
  });