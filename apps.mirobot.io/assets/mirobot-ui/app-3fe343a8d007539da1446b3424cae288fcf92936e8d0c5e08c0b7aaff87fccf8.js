/*!
  * snack.js (c) Ryan Florence
  * https://github.com/rpflorence/snack
  * MIT License
  * Inspiration and code adapted from
  *  MooTools      (c) Valerio Proietti   MIT license
  *  jQuery        (c) John Resig         Dual license MIT or GPL Version 2
  *  contentLoaded (c) Diego Perini       MIT License
  *  Zepto.js      (c) Thomas Fuchs       MIT License
*/


if (typeof Object.create != 'function'){
  // ES5 Obeject.create
  Object.create = function (o){
    function F() {}
    F.prototype = o
    return new F
  }
}

!function(window){
  var snack = window.snack = {}
    , guid = 0
    , toString = Object.prototype.toString
    , indexOf = [].indexOf
    , push = [].push

  snack.extend = function (){
    if (arguments.length == 1)
      return snack.extend(snack, arguments[0])

    var target = arguments[0]

    for (var key, i = 1, l = arguments.length; i < l; i++)
      for (key in arguments[i])
        target[key] = arguments[i][key]

    return target
  }

  snack.extend({
    v: '1.2.3',

    bind: function (fn, context, args) {
      args = args || [];
      return function (){
        push.apply(args, arguments);
        return fn.apply(context, args)
      }
    },

    punch: function (obj, method, fn, auto){
      var old = obj[method]
      obj[method] = auto ? function (){
        old.apply(obj, arguments)
        return fn.apply(obj, arguments)
      } : function (){
        var args = [].slice.call(arguments, 0)
        args.unshift(snack.bind(old, obj))
        return fn.apply(obj, args)
      }
    },

    create: function (proto, ext){
      var obj = Object.create(proto)
      if (!ext)
        return obj

      for (var i in ext) {
        if (!ext.hasOwnProperty(i))
          continue

        if (!proto[i] || typeof ext[i] != 'function'){
          obj[i] = ext[i]
          continue
        }

        snack.punch(obj, i, ext[i])
      }

      return obj
    },

    id: function (){
      return ++guid
    },

    each: function (obj, fn, context){
      if (obj.length === void+0){ // loose check for object, we want array-like objects to be treated as arrays
        for (var key in obj)
          if (obj.hasOwnProperty(key))
            fn.call(context, obj[key], key, obj);
        return obj
      }

      for (var i = 0, l = obj.length; i < l; i++)
        fn.call(context, obj[i], i, obj)
      return obj
    },

    parseJSON: function(json) {
      // adapted from jQuery
      if (typeof json != 'string')
        return

      json = json.replace(/^\s+|\s+$/g, '')

      var isValid = /^[\],:{}\s]*$/.test(json.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
        .replace(/(?:^|:|,)(?:\s*\[)+/g, ""))

      if (!isValid)
        throw "Invalid JSON"
      
      var JSON = window.JSON // saves a couple bytes
      return JSON && JSON.parse ? JSON.parse(json) : (new Function("return " + json))()
    },

    isArray: function (obj){
      return obj instanceof Array || toString.call(obj) == "[object Array]"
    },

    indexOf: indexOf ? function(item, array){
        return indexOf.call(array, item)
      } : function (item, array){
      for (var i = 0, l = array.length; i < l; i++)
        if (array[i] === item)
          return i

      return -1
    }
  })
}(window);
!function (snack, document){
  var proto = {}
    , query

  snack.wrap = function (nodes, context){
    // passed in a CSS selector
    if (typeof nodes == 'string')
      nodes = query(nodes, context)

    // passed in single node
    if (!nodes.length)
      nodes = [nodes]

    var wrapper = Object.create(proto)
      , i = 0
      , l = nodes.length

    for (; i < l; i++)
      wrapper[i] = nodes[i]

    wrapper.length = l
    wrapper.id = snack.id()
    return wrapper
  }

  snack.extend(snack.wrap, {
    define: function(name, fn){
      if (typeof name != 'string'){
        for (var i in name)
          snack.wrap.define(i, name[i])
        return
      }
      proto[name] = fn
    },

    defineEngine: function (fn){
      query = fn
    }
  })

  // QSA default selector engine, supports real browsers and IE8+
  snack.wrap.defineEngine(function (selector, context){
    if (typeof context == 'string')
      context = document.querySelector(context)

    return (context || document).querySelectorAll(selector)
  })
}(snack, document)
!function (snack, window, document){
  var add            = document.addEventListener ? 'addEventListener' : 'attachEvent'
    , remove         = document.addEventListener ? 'removeEventListener' : 'detachEvent'
    , prefix         = document.addEventListener ? '' : 'on'
    , ready          = false
    , top            = true
    , root           = document.documentElement
    , readyHandlers  = []

  snack.extend({
    stopPropagation: function (event){
      if (event.stopPropagation)
        event.stopPropagation()
      else
        event.cancelBubble = true
    },

    preventDefault: function (event){
      if (event.preventDefault)
        event.preventDefault()
      else
        event.returnValue = false
    }
  })

  snack.listener = function (params, handler){
    if (params.delegate){
      params.capture = true
      _handler = handler
      handler = function (event){
        // adapted from Zepto
        var target = event.target || event.srcElement
          , nodes = typeof params.delegate == 'string'
            ? snack.wrap(params.delegate, params.node)
            : params.delegate(params.node)

        while (target && snack.indexOf(target, nodes) == -1 )
          target = target.parentNode

        if (target && !(target === this) && !(target === document))
          _handler.call(target, event, target)
      }
    }

    if (params.context)
      handler = snack.bind(handler, params.context)

    var methods = {
      attach: function (){
        params.node[add](
          prefix + params.event,
          handler,
          params.capture
        )
      },

      detach: function (){
        params.node[remove](
          prefix + params.event,
          handler,
          params.capture
        )
      },

      fire: function (){
        handler.apply(params.node, arguments)
      }
    }

    methods.attach()

    return methods
  }




  snack.ready = function (handler){
    if (ready){
      handler.apply(document)
      return
    }
    readyHandlers.push(handler)
  }

  // adapted from contentloaded
  function init(e) {
    if (e.type == 'readystatechange' && document.readyState != 'complete')
      return

    (e.type == 'load' ? window : document)[remove](prefix + e.type, init, false)

    if (!ready && (ready = true))
      snack.each(readyHandlers, function (handler){
        handler.apply(document)
      })
  }

  function poll() {
    try {
      root.doScroll('left')
    } catch(e) { 
      setTimeout(poll, 50)
      return
    }
    init('poll')
  }

  if (document.createEventObject && root.doScroll) {
    try {
      top = !window.frameElement
    } catch(e) {}
    if (top)
      poll();
  }

  document[add](prefix + 'DOMContentLoaded', init, false)
  document[add](prefix + 'readystatechange', init, false)
  window[add](prefix + 'load', init, false)
}(snack, window, document);
!function(snack, document){
  snack.wrap.define({
    data: function (){
      // API inspired by jQuery
      var storage = {}

      return function (key, value){
        var data = storage[this.id]

        if (!data)
          data = storage[this.id] = {}

        if (value === void+1)
          return data[key]

        return data[key] = value
      }  
    }(),

    each: function (fn, context){
      return snack.each(this, fn, context)
    },
  
    addClass: function (className){
      // adapted from MooTools
      return this.each(function (element){
        if (clean(element.className).indexOf(className) > -1)
          return
        element.className = clean(element.className + ' ' + className)
      })
    },

    removeClass: function (className){
      // adapted from MooTools
      return this.each(function (element){
        element.className = element.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1')
      })
    },

    attach: function (event, handler, /* internal */ delegation){
      var split = event.split('.')
        , listeners = []

      if (split[1])
        listeners = this.data(split[1]) || []

      this.each(function(node){
        var params = {
          node: node,
          event: split[0]
        }

        if (delegation)
          params.delegate = delegation

        listeners.push(snack.listener(params, handler))
      })

      if (split[1])
        this.data(split[1], listeners)

      return this
    },

    detach: function (namespace){
      listenerMethod(this, 'detach', namespace, null, true)
      this.data(namespace, null)
      return this
    },

    fire: function (namespace, args){
      return listenerMethod(this, 'fire', namespace, args)
    },

    delegate: function (event, delegation, handler){
      return this.attach(event, handler, delegation)
    }
  })

  function clean(str){
    return str.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '')
  }

  function listenerMethod(wrapper, method, namespace, args){
    var data = wrapper.data(namespace)

    if (data)
      snack.each(data, function (listener){
        listener[method].apply(wrapper, args)
      })

    return wrapper
  }
}(snack, document);

snack.wrap.define('hide', function (){
  return this.each(function (element){
    element.style.display = 'none'
  })
})
snack.wrap.define('show', function (){
  return this.each(function (element){
    element.style.display = ''
  })
})
snack.wrap.define('remove', function (){
  return this.each(function (element){
    if(element.parentNode){
      element.parentNode.removeChild( element );
    }
  })
})
;
var FnInstance = function(fn, el, mirobot){
  this.fn = fn;
  this.el = el;
  this.mirobot = mirobot;
  this.parent = false;
  this.children = []
}

FnInstance.prototype = {
  run: function(children){
    var self = this;
    if(self.fn){
      // This is a function
      self.fn.run(self, self.mirobot, function(state){ self.updateState(state)});
    }else{
      // This is the root container
      for(var i in self.children){
        self.children[i].run();
      }
    }
  },
  updateState: function(state){
    if(state === 'started'){
      $(this.el).addClass('active');
    }else if(state === 'complete'){
      $(this.el).removeClass('active');
    }
    if(this.parent && this.parent.el){
      this.parent.updateState(state);
    }
  },
  addChild: function(child){
    child.parent = this;
    this.children.push(child);
  },
  args: function(){
    var self = this;
    var args ={}
    if(this.fn){
      snack.each(this.fn.content, function(item){
        if(typeof item === 'object'){
          args[item.name] = self.el.querySelector('[name='+ item.name + ']').value;
        }
      });
    }
    return args;
  },
  toObject: function(){
    var out = {
      fn: this.fn ? this.fn.name : 'root',
      parent: this.fn ? this.fn.type === 'parent' : true,
      args: this.args(),
      children: []
    }
    if(this.children.length){
      out.children = this.children.map(function(c){ return c.toObject(); });
    }
    return out;
  }
}

var Builder = function(el, mirobot, disableLocalstorage){
  var self = this;
  this.el = el;
  this.mirobot = mirobot;
  this.fns = {};
  this.paused = false;
  this.following = false;
  this.colliding = false;
  this.store = !disableLocalstorage;
  this.init();

  snack.each(this.functions, function(f){
    self.fns[f.name] = f;
  });
}

Builder.prototype = {
  prog:null,
  setMirobot: function(mirobot){
    this.mirobot = mirobot;
    this.initMirobot();
  },
  initMirobot: function(){
    if(typeof this.mirobot === 'undefined') return;
    var self = this;
    this.mirobot.addEventListener('programComplete', function(){ self.progCompleteHandler() });
    this.mirobot.addEventListener('readyStateChange', function(){ self.updateMirobotState() });
    this.updateMirobotState();
  },
  init: function(){
    var self = this;
    var adjustment;
    this.el.addClass('editor');
    this.el[0].innerHTML = this.mainUI;
    this.setSize();
    window.addEventListener('resize', function(){self.setSize();});

    // Stop the whole page scrolling in touch browsers except in the program
    document.addEventListener('touchmove', function(e) {
      var el = e.target;
      while(el = el.parentElement){
        if(el.id === 'program'){
          return;
        }
      }
      e.preventDefault();
    }, false);
    
    this.runner = $('.editor .run');
    this.pause = $('.editor .pause');
    this.stop = $('.editor .stop');
    this.clear = $('.editor .clear');
    this.follow = $('.editor #follow');
    this.collide = $('.editor #collide');
    this.runner.attach('click', function(e){self.runProgram()});
    this.pause.attach('click', function(e){self.pauseProgram()});
    this.stop.attach('click', function(e){self.stopProgram()});
    this.clear.attach('click', function(e){self.clearProgram()});
    this.follow.attach('click', function(e){self.followClick()});
    this.collide.attach('click', function(e){self.collideClick()});
    
    this.initMirobot();

    this.addFunctions();
    this.resumeProgram();
  },
  updateMirobotState: function(){
    if(this.mirobot.ready()){
      this.el.addClass('ready');
      this.el.removeClass('notReady');
    }else{
      this.el.removeClass('ready');
      this.el.addClass('notReady');
    }
  },
  supportsLocalStorage: function(){
    try {
      localStorage.setItem('test', true);
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  },
  saveProgram: function(){
    var prog = new FnInstance(null, null, null);
    this.generate($('.editor ol.program')[0], prog);
    return JSON.stringify(prog.toObject());
  },
  loadProgram: function(input){
    this.clearProgram();
    var prog = JSON.parse(input);
    if(prog.fn === 'root' && prog.children && prog.children.length > 0){
      this.instantiateProgram(prog.children, document.querySelectorAll('.editor .program')[0]);
      this.showHints();
      this.sortLists();
    }
  },
  storeProgram: function(){
    if(this.supportsLocalStorage() && this.store){
      localStorage['mirobot.currentProgram'] = this.saveProgram();
    }
  },
  resumeProgram: function(){
    if(this.supportsLocalStorage() && localStorage['mirobot.currentProgram'] && this.store){
      this.loadProgram(localStorage['mirobot.currentProgram'])
    }
  },
  instantiateProgram: function(fns, el){
    var self = this;
    if(fns && fns.length){
      for(var i = 0; i< fns.length; i++){
        var newEl = document.querySelectorAll('.functionList .fn-' + fns[i].fn)[0].cloneNode(true);
        el.appendChild(newEl);
        for(var arg in fns[i].args){
          if(fns[i].args.hasOwnProperty(arg)){
            var input = newEl.querySelector("[name='" + arg + "']");
            input.value = fns[i].args[arg];
          }
        }
        self.checkForChanges(newEl);
        snack.wrap(newEl).draggableList({
          target: 'ol.program',
          placeholder: '<li class="placeholder"/>',
          copy: false,
          ondrag: function(){self.showHints()},
          onchange: function(){self.storeProgram(); self.sortLists();}
        });
        if(fns[i].parent){
          this.instantiateProgram(fns[i].children, newEl.getElementsByTagName('ol')[0]);
        }
      }
    }
  },
  setSize: function(){
    var w = window,
      d = document,
      e = d.documentElement,
      g = d.getElementsByTagName('body')[0],
      x = w.innerWidth || e.clientWidth || g.clientWidth,
      y = w.innerHeight|| e.clientHeight|| g.clientHeight;
    var right = this.el[0].getElementsByClassName('right')[0];
    var prog = this.el[0].getElementsByClassName('programWrapper')[0];
    var buttons = this.el[0].getElementsByClassName('buttons')[0];
    right.style.height = y - right.offsetTop - 27 + 'px';
    prog.style.height = buttons.offsetTop - prog.offsetTop + 'px';
  },
  progCompleteHandler: function(e){
    this.runner.show();
    this.pause.hide();
  },
  showHints: function(){
    $('.editor .programWrapper ol').each(function(el){
      el.getElementsByClassName('hint')[0].style.display = (el.children.length === 1 ? 'block' : 'none')
    });
  },
  sortLists: function(){
    var ends = this.el[0].querySelectorAll('.programWrapper li.end')
    snack.each(ends, function(end){
      end.parentNode.appendChild(end);
    });
  },
  checkForChanges: function(elem){
    var self = this;
    var inputs = elem.querySelectorAll('input, select');
    snack.each(inputs, function(el){
      el.addEventListener('change', function(){ self.storeProgram();});
    });
  },
  generateInput: function(conf){
    if(conf.input === 'number'){
      return '<input type="number" size="4" name="' + conf.name + '" value="' + conf.default + '" />';
    }else if(conf.input === 'option'){
      var select = '<select name="'+ conf.name +'">';
      for(var j in conf.values){
        select += '<option value="' + conf.values[j] + '"';
        if(conf.default === conf.values[j]){
          select += 'selected="selected"';
        }
        select += '>' + l(':'+conf.values[j]) + '</option>';
      }
      select += '</select>';
      return select;
    }
  },
  addFunctions: function(){
    var self = this;
    snack.each(this.functions, function(i, f){
      f = self.functions[f];
      var fn = '<li class="function fn-' + f.name + ' draggable" data-fntype="' + f.name + '">';
      var content = f.content.str;
      var re = /\[\[([^\ ]*)\]\]/g; 
      while ((m = re.exec(content)) !== null) {
          if (m.index === re.lastIndex) {
              re.lastIndex++;
          }
          content = content.replace('[[' + m[1] + ']]', self.generateInput(f.content[m[1]]));
      }
      fn += content;
      
      if(f.type === 'parent'){
        fn += '<ol><li class="end"><div class="hint">Drag functions into here!</div></li></li></ol>';
      }
      fn += '</li>';
      $('.editor .functionList')[0].innerHTML += fn;
    });
    $('.functionList li.draggable').draggableList({
      target: 'ol.program',
      placeholder: '<li class="placeholder"/>',
      copy: true,
      ondrag: function(){self.showHints()},
      onchange: function(){self.storeProgram(); self.sortLists();},
      onaddelem: function(elem){self.checkForChanges(elem);}
    });
  },
  runProgram: function(){
    if(!this.mirobot.ready()) return;
    if(this.following || this.colliding || !this.mirobot){ return; }
    if(this.paused){
      this.mirobot.resume();
    }else{
      this.prog = new FnInstance(null, null, null);
      this.generate($('.editor ol.program')[0], this.prog);
      this.prog.run()
    }
    this.pause.show();
    this.runner.hide();
    this.paused = false;
  },
  pauseProgram: function(){
    if(!this.mirobot.ready()) return;
    var self = this;
    this.paused = true;
    if(!this.mirobot){ return; }
    this.mirobot.pause(function(){
      self.runner.show();
      self.pause.hide();
    });
  },
  stopProgram: function(cb){
    if(!this.mirobot.ready()) return;
    var self = this;
    if(!this.mirobot){ return; }
    this.mirobot.stop(function(){
      self.runner.show();
      self.pause.hide();
      self.paused = false;
      self.colliding = false;
      self.following = false;
      self.updateState();
      cb && cb();
    });
  },
  clearProgram: function(){
    this.stopProgram();
    $('.editor ol.program li.function').remove();
    this.storeProgram();
    this.showHints();
  },
  updateState: function(){
    this.follow[0].innerHTML = this.following ? "&#9724; Stop Following Lines" : "&#9654; Start Following Lines";
    this.collide[0].innerHTML = this.colliding ? "&#9724; Stop Collision Detection" : "&#9654; Start Collision Detection";
    this.runner[0].className = (this.colliding || this.following) ? "run disabled" : "run";
  },
  followClick: function(e){
    var self = this;
    if(self.following){
      self.stopProgram();
    }else{
      self.stopProgram(function(){
        self.mirobot.follow(function(){
          self.following = true;
          self.updateState();
        });
      });
    }
  },
  collideClick: function(e){
    var self = this;
    if(this.colliding){
      this.stopProgram();
    }else{
      this.stopProgram(function(){
        self.mirobot.collide(function(){
          self.colliding = true;
          self.updateState();
        });
      });
    }
  },
  generate: function(el, parent){
    var self = this;
    snack.each(el.childNodes, function(el){
      if(el.nodeName.toLowerCase() === 'li' && el.className.match(/function/) && el.dataset.fntype){
        var fn = self.fns[el.dataset.fntype];
        var inst = new FnInstance(fn, el, self.mirobot);
        parent.addChild(inst);
        if(fn.type === 'parent'){
          var children = el.childNodes;
          for(var i = 0; i< children.length; i++){
            if(children[i].nodeName.toLowerCase() === 'ol'){
              self.generate(children[i], inst);
            }
          }
        }
      }
    });
  },
  functions:[
    {
      name:'move',
      type:'child',
      content:{
        str: l(":move-cmd"),
        direction: {name: 'direction', input:'option', default:'forward', values:['forward', 'back']},
        distance: {name: 'distance', input:'number', default:100}
      },
      run: function(node, mirobot, cb){
        mirobot.move(node.args().direction, node.args().distance, cb);
      }
    },
    {
      name:'turn',
      type:'child',
      content:{
        str: l(":turn-cmd"),
        direction: {name: 'direction', input:'option', default:'left', values:['left', 'right']},
        angle: {name: 'angle', input:'number', default:90}
      },
      run: function(node, mirobot, cb){
        mirobot.turn(node.args().direction, node.args().angle, cb);
      }
    },
    {
      name:'penup',
      type:'child',
      content:{str: l(":penup-cmd")},
      run: function(node, mirobot, cb){
        mirobot.penup(cb);
      }
    },
    {
      name:'pendown',
      type:'child',
      content:{str: l(":pendown-cmd")},
      run: function(node, mirobot, cb){
        mirobot.pendown(cb);
      }
    },
    {
      name:'repeat',
      type:'parent',
      content:{
        str: l(":repeat-cmd"),
        count: {name: 'count', input:'number', default:2}
      },
      run: function(node, mirobot, cb){
        for(var i=0; i< node.args().count; i++){
          for(var j=0; j< node.children.length; j++){
            node.children[j].run();
          }
        }
      }
    },
    {
      name:'beep',
      type:'child',
      content:{
        str: l(":beep-cmd"),
        duration: {name: 'duration', input:'number', default:0.5}
      },
      run: function(node, mirobot, cb){
        mirobot.beep(node.args().duration * 1000, cb);
      }
    }
  ]
}



Builder.prototype.mainUI = '\
<div class="left container">\
  <h2>' + l(':toolbox') + '</h2>\
  <ol class="functionList"></ol>\
  <div class="extra">\
    <button id="follow">&#9654; ' + l(':start-following') + '</button>\
    <button id="collide">&#9654; ' + l(":start-collision") + '</button>\
  </div>\
</div>\
<div class="right container">\
  <h2>' + l(':program') + '</h2>\
  <div class="programWrapper">\
    <ol class="program" id="program">\
      <li class="end"><div class="hint">' + l(':drag') + '</div></li>\
    </ol>\
  </div>\
  <div class="buttons">\
<button class="run">&#9654; ' + l(':run') + '</button>\
<button class="pause" style="display:none;">&#10074;&#10074; ' + l(':pause') + '</button>\
<button class="stop">&#9724; ' + l(':stop') + '</button>\
<button class="clear">&#10006; ' + l(':clear') + '</button>\
  </div>\
</div>\
';
snack.wrap.define('draggableList', function(config){
  var clickTimeout;
  var dragging = false;
  var dragEl;
  var movers;
  var body = snack.wrap('body');
  var offset;
  var placeholder;
  
  var setPos = function(el, x, y){
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }
  
  // Works out if a point is within an element
  var intersect = function(x, y, el){
    var rect = el.getBoundingClientRect();
    return x >= rect.left &&
           x <= rect.right &&
           y >= rect.top &&
           y <= rect.bottom;
  }
  
  var ancestor = function(el1, el2){
    if(el1 === el2){
      return true;
    }
    while(el1 = el1.parentElement){
      if(el1 === el2){
        return true;
      }
    }
    return false;
  }

  var movePlaceholder = function(event){
    // Create the placeholder if it doesn't exist already
    if(!placeholder){ 
      var div = document.createElement('div');
      div.innerHTML = config.placeholder;
      placeholder = div.childNodes[0];
    }
    
    var target = snack.wrap(config.target)[0];
    // If we're over the drop area, work out where to put the placeholder
    var dragRect = dragEl.getBoundingClientRect();
    if(intersect(event.pageX, event.pageY, target)){
      // find the li that's nearest to the cursor and insert placeholder bofore it
      var targets = Array.prototype.slice.call( target.getElementsByTagName('li'), 0 ).filter(function(el){ return !ancestor(el, dragEl) });
      // calculate vertical distances
      var dists = targets.map(function(t){
        return [t, Math.abs(event.pageY - t.getBoundingClientRect().top)];
      });
      // find the nearest
      var nearest = dists.reduce(function(prev, curr){
        return (prev[1] < curr[1] ? prev : curr);
      });
      // insert placeholder before
      nearest[0].parentNode.insertBefore(placeholder, nearest[0]);
      placeholder.style.height = dragEl.getBoundingClientRect().height - 22 + 'px';
    }else{
      if(placeholder){
        snack.wrap(placeholder).remove();
      }
    }
  }
  
  var killEvent = function(e){
    e.cancelBubble = true;
    e.stopPropagation();
    e.preventDefault();
    e.returnValue = false;
  }

  var startDrag = function(element, event){
    // Can't stop events bubbling on iOS so resorting to this more manual hack
    if(event.handled){return;}
    event.handled = true;
    // Set the currently selected elements as default, otherwise when copied the settings reset
    snack.each(element.getElementsByTagName('option'), function(el){
      el.value === el.parentNode.value ? el.setAttribute("selected", "selected") : el.removeAttribute("selected");
    });
    // Either use or copy the node
    dragEl = (config.copy ? element.cloneNode(true) : element)
    // Store the offset of the mouse from top left
    offset = {
      x: event.pageX - element.offsetLeft,
      y: event.pageY - element.offsetTop
    }
    // Style it so it looks the same (padding and border currently hardcoded)
    dragEl.style.width = element.offsetWidth - 22 + 'px';
    dragEl.style.height = element.offsetHeight - 22 + 'px';
    dragEl.style.display = 'block';
    dragEl.style.position = 'absolute';
    snack.wrap(dragEl).addClass('dragged');
    snack.wrap('body').addClass('dragging');
    setPos(dragEl, event.pageX - offset.x, event.pageY - offset.y);
    element.parentElement.appendChild(dragEl);
    movePlaceholder(event);
    dragging = true;
    killEvent(event);
  }
  
  // Called on move to update the position and the placeholder
  var drag = function(event){
    if(!dragging){ return; }
    setPos(dragEl, event.pageX - offset.x, event.pageY - offset.y);
    movePlaceholder(event);
    config.ondrag && config.ondrag();
    killEvent(event);
  }
  
  // Drop it in place
  var stopDrag = function(event){
    if(!dragging){return;}
    if(movers){
      movers.detach('movers');
      movers = undefined;
    }
    dragging = false;
    snack.wrap('body').removeClass('dragging');
    snack.wrap(dragEl).removeClass('dragged');
    dragEl.parentNode.removeChild( dragEl );
    if(placeholder.parentNode){
      placeholder.parentNode.insertBefore(dragEl, placeholder);
      if(!dragEl._draggable){
        snack.wrap(dragEl).draggableList({
          target: config.target,
          placeholder: '<li class="placeholder"/>',
          copy: false
        });
      }
    }
    
    dragEl.style.width = ''
    dragEl.style.height = '';
    dragEl.style.display = '';
    dragEl.style.position = '';
    
    snack.wrap(placeholder).remove();
    killEvent(event);
    config.onchange && config.onchange();
    config.copy && config.onaddelem && config.onaddelem(dragEl);
  }
  
  // Monolithic event handler for all of the events
  var eventHandler = function(event, element){
    var elType = (event.target || event.srcElement).nodeName.toLowerCase();
    if(elType !== 'select' && elType !== 'input'){
      if(event.type === 'mousedown'){
        // start listening to move and up
        movers = addEventHandlers(['mouseup', 'mousemove'], body, 'movers');
        // start dragging
        startDrag(element, event);
      }else if(event.type === 'touchstart'){
        // Add a small delay to differentiate from page scroll
        clickTimeout = window.setTimeout(function(){
          startDrag(element, event);
        }, 100);
        // start listening to move and end
        movers = addEventHandlers(['touchend', 'touchmove'], body, 'movers');
      }else if(event.type === 'touchend' || event.type === 'mouseup'){
        // Clear the timeout if we've released before it triggered
        if(clickTimeout){
          clearTimeout(clickTimeout);
        }
        // Stop dragging
        stopDrag(event);
      }else if(event.type === 'touchmove' || event.type === 'mousemove'){
        // Clear the timeout if we've moved before it triggered
        if(clickTimeout){
          clearTimeout(clickTimeout);
        }
        // Stop dragging
        drag(event);
      }
    }
  }
  
  // Attach handlers
  var addEventHandlers = function(events, element, ns){
    var el = snack.wrap(element);
    var res_el;
    ns = (ns ? '.' + ns : '');
    snack.each(events, function(ev){
      res_el = el.attach(ev + ns, function(event){eventHandler(event, element)});
      if(ev === 'mousedown' || ev === 'touchstart'){
        // Stop event propagation on form elements
        snack.each(['select', 'input'], function(tag){
          var tags = element.getElementsByTagName(tag);
          for(var i = 0; i< tags.length; i++){
            tags[i].addEventListener(ev, function(e){e.stopPropagation();});
          }
        });
      }
    });
    return res_el;
  }
  
  return this.each(function (element){
    // Apply handlers to the elements
    addEventHandlers(['mousedown', 'touchstart'], element);
    // Add this so we don't make things draggable twice
    element._draggable = true;
  })
})
  

;
var $ = snack.wrap;
var builder = new Builder($('#code'), undefined, true);
var app  = new MirobotApp({
  l10n: true,
  languages: baseLanguages,
  simulation: true
});
builder.setMirobot(app.mirobot);

app.initPersistence({
  saveHandler: function(){ return builder.saveProgram(); },
  loadHandler: function(prog){ return builder.loadProgram(prog); },
  clearHandler: function(){ return builder.clearProgram(); }
});




