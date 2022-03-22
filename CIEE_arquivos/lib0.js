$root = '';
function $(a)
{
  return document.getElementById(a);
}

if (!String.prototype.endsWith) 
{
  String.prototype.endsWith = function(searchString, position) 
  {
    var subjectString = this.toString();
    if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
      position = subjectString.length;
    }
    position -= searchString.length;
    var lastIndex = subjectString.indexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };
}

Element.prototype.hasClass = function(klass)
{
  if (this.classList)
    return this.classList.contains(klass);
  else
    return !!this.className.match(new RegExp('(\\s|^)' + klass + '(\\s|$)'));
};

Element.prototype.addClass = function(klass)
{
  if (this.classList)
    this.classList.add(klass);
  else if (!this.hasClass(klass))
    this.className += " " + klass;
};

Element.prototype.removeClass = function(klass)
{
  if (this.classList)
    this.classList.remove(klass);
  else if (this.hasClass(klass)) 
  {
    var reg = new RegExp('(\\s|^)' + klass + '(\\s|$)');
    this.className = this.className.replace(reg, ' ');
  }
};

/*Element.prototype.ensureVisible = function()
{
  var parent = this.offsetParent;
  
  while (parent && parent.clientHeight == parent.scrollHeight && parent.clientWidth == parent.scrollWidth)
    parent = parent.offsetParent;
  
  if (parent)
    gw.ensureVisible(this.offsetParent, this.offsetLeft, this.offsetTop, this.offsetWidth, this.offsetHeight);
};*/

gw = {

  version: '0',
  commands: [],
  timers: {},
  windows: [],
  form: '',
  debug: false,
  loaded: {},
  uploads: {},
  autocompletion: [],
  focus: false,
  lock: 0,
  
  log: function(msg)
  {
    if (gw.debug)
    {
      if (gw.startTime == undefined)
        gw.startTime = Date.now();
      console.log(((Date.now() - gw.startTime) / 1000).toFixed(3) + ': ' + msg);
    }
  },
  
  load: function(lib)
  {
    var elt, src;
    
    if (gw.loaded[lib])
      return;
    
    if (lib.endsWith('.js'))
    {
      elt = document.createElement('script');
      elt.setAttribute("type", "text/javascript");
      src = $root + '/lib:' + lib.slice(0, -3) + ':' + gw.version + '.js';
      elt.setAttribute("src", src);
    }
    else if (lib.endsWith('.css'))
    {
      elt = document.createElement('link');
      elt.setAttribute("rel", "stylesheet");
      elt.setAttribute("type", "text/css");
      src = $root + '/style:' + lib.slice(0, -4) + ':' + gw.version + '.css';
      elt.setAttribute("href", src);
    }
    else
      return;
      
    document.getElementsByTagName("head")[0].appendChild(elt);
    gw.loaded[lib] = src;
    console.log('load: ' + src);
  },
  
  setInnerHtml: function(id, html)
  {
    var oldDiv = $(id);
    var newDiv = oldDiv.cloneNode(false);
    newDiv.innerHTML = html;
    oldDiv.parentNode.replaceChild(newDiv, oldDiv);
  },
  
  setOuterHtml: function(id, html)
  {
    if ($(id))
      $(id).outerHTML = html;
    else
      console.log('setOuterHtml: ' + id + '? ' + html);
  },
  
  removeElement: function(id)
  {
    var elt = $(id);
    //for (i = 0; i < id_list.length; i++)
    //{
      //elt = $(id_list[i]);
      if (!elt)
        return;
    
      //console.log(id + " removed");
    
      elt.parentNode.removeChild(elt);
    //}
  },
  
  insertElement: function(id, parent)
  {
    var elt;
    var pelt = $(parent);
    
    if (!pelt)
      return;
      
    elt = document.createElement('div');
    elt.id = id;
    pelt.appendChild(elt);
  },

  setVisible: function(id, visible)
  {
    var elt = $(id);
    if (elt)
    {
      if (visible)
        elt.removeClass('gw-hidden');
      else
        elt.addClass('gw-hidden');
    }
  },
  
  saveFocus: function() {
    var active = document.activeElement.id;
    var selection;
    
    if (active)
      selection = gw.getSelection($(active));
      
    return [active, selection];
  },
  
  restoreFocus: function(save) {
    var elt;
    
    if (save[0])
    {
      elt = $(save[0])
      if (elt) 
      {
        elt.focus();
        gw.setSelection(elt, save[1]);
      }
    }
    //else
    //  gw.active = document.activeElement.id;
  },
  
  wait: function(lock) {
    var elt;
    
    if (lock)
    {
      if (gw.lock == 0)
      {
        elt = $('gw-lock');
        elt.style.zIndex = 1000;
        elt.style.display = 'block';
        
        gw.lock_id = setTimeout(function() {
          $('gw-lock').style.opacity = '1';
          gw.lock_id = undefined;
          }, 500);
      }
      
      gw.lock++;
    }
    else
    {
      gw.lock--;
      if (gw.lock == 0)
      {
        if (gw.lock_id)
        {
          clearTimeout(gw.lock_id);
          gw.lock_id = undefined;
        }
        elt = $('gw-lock');
        elt.style.display = 'none';
        elt.style.opacity = '0';
      }
    }
  },
  
  answer: function(xhr, after)
  {
    if (xhr.readyState == 4)
    {
      if (xhr.status == 200 && xhr.responseText)
      {
        xhr.gw_command && gw.log('==> ' + xhr.gw_command + '...');
        
        gw.focus = false;
        var save = gw.saveFocus();
        
        /*if (gw.debug)
          console.log('--> ' + xhr.responseText);*/
        
        var r = xhr.responseText.split('\n');
        var i, expr;
        
        for (i = 0; i < r.length; i++)
        {
          expr = r[i].trim();
          if (expr.length == 0)
            continue;
          if (gw.debug)
          {
            if (expr.length > 1024)
              gw.log('--> ' + expr.substr(0, 1024) + '...');
            else
              gw.log('--> ' + expr);
          }
          eval(expr);
        }
         
        //eval(xhr.responseText);
        
        if (!gw.focus)
          gw.restoreFocus(save);
        
      }
      
      if (after)
        after();
        
      xhr.gw_command && gw.log('==> ' + xhr.gw_command + ' done.');
      
      if (xhr.gw_command && (xhr.gw_command.length < 5 || xhr.gw_command[4] == undefined || xhr.gw_command[4] == false))
        gw.wait(false);
        
      gw.commands.splice(0, 2);
      gw.sendNewCommand();
    }
  },
  
  sendNewCommand: function()
  {
    var command, after, len;
    var xhr;
    
    for(;;) {
    
      len = gw.commands.length;
      
      if (len < 2)
        return;
      
      command = gw.commands[0];
      after = gw.commands[1];
  
      gw.log('[ ' + command + ' ]');
    
      if (command)
      {
        if (command.length < 5 || command[4] == undefined || command[4] == false)
          gw.wait(true);
          
        xhr = new XMLHttpRequest();
        xhr.gw_command = command;
        xhr.open('GET', $root + '/x?c=' + encodeURIComponent(JSON.stringify(command)), true);
        xhr.onreadystatechange = function() { gw.answer(xhr, after); };
        xhr.send(null);
        gw.log("send XMLHttpRequest...");
        return;
      }
      
      after();
      gw.commands.splice(0, 2);
    }
  },

  send: function(command, after)
  {
    gw.log('gw.send: ' + command + ' ' + JSON.stringify(gw.commands));
    
    gw.commands.push(command);
    gw.commands.push(after);
    
    if (gw.commands.length == 2)
      gw.sendNewCommand();
  },

  raise: function(id, event, args, no_wait)
  {
    gw.send(['raise', id, event, args, no_wait]);
  },
  
  update: function(id, prop, value, after)
  {
    gw.send(['update', id, prop, value, true], after);
  },
  
  updateWait: function(id, prop, value, after)
  {
    gw.send(['update', id, prop, value, false], after);
  },
  
  command: function(action)
  {
    gw.send(null, action);
  },

  getSelection: function(o)
  {
    var start, end;
    
    try
    {
      if (o.createTextRange) 
      {
        var r = document.selection.createRange().duplicate();
        r.moveEnd('character', o.value.length)
        if (r.text == '')
          start = o.value.length;
        else
          start = o.value.lastIndexOf(r.text);
        r.moveStart('character', -o.value.length);
        end = r.text.length;
        return [start, end];
      }
      
      if (o.selectionStart && o.selectionEnd)
        return [o.selectionStart, o.selectionEnd];
    }
    catch(e) {};
    
    return undefined;
  },
  
  setSelection: function(o, sel)
  {
    if (sel)
    {
      if (o.setSelectionRange)
        try { o.setSelectionRange(sel[0], sel[1]) } catch(e) {};
    }
  },
  
  setFocus: function(id)
  {
    var elt = $(id + ':entry') || $(id);
    
    if (elt)
    {
      elt.focus();
      gw.active = document.activeElement.id;
      gw.selection = undefined;
      gw.focus = true;
    }
  },
  
  highlightMandatory: function(id)
  {
    var elt = $(id);
    var elt_br;
    var div;
    var div_br;
    
    if (elt == undefined || elt.gw_mandatory)
      return;
    
    elt.gw_mandatory = div = document.createElement('div');
    div.className = 'gw-mandatory';
    elt.parentNode.insertBefore(div, elt);
    
    elt_br = gw.getPos(elt);
    div_br = gw.getPos(div);
    
    div.style.top = (elt_br.top - div_br.top) + 'px';
    div.style.left = (elt_br.left - div_br.left) + 'px';
    div.style.width = elt_br.width + 'px';
    div.style.height = elt_br.height + 'px';
  },
  
  addTimer: function(id, delay)
  {
    gw.removeTimer(id);
    gw.timers[id] = setInterval(
      function() {
        if (gw.timers[id + '!'])
          return;
        gw.timers[id + '!'] = true;
        gw.send(['raise', id, 'timer', [], true],
          function() {
            if (gw.timers[id])
              gw.timers[id + '!'] = undefined;
            }
          );
      },
      delay);
  },
  
  removeTimer: function(id)
  {
    var t = gw.timers[id];
    if (t)
    {
      clearInterval(gw.timers[id]);
      gw.timers[id] = undefined;
      gw.timers[id + '!'] = undefined;
    }
  },
  
  getTargetId: function(elt)
  {
    for(;;)
    {
      if (elt.id)
        return elt.id;
      elt = elt.parentNode;
      if (!elt)
        return;
    }
  },

  getPos: function(elt)
  {
    var found, left = 0, top = 0, width = 0, height = 0;
    var offsetBase = gw.offsetBase;
   
    if (!offsetBase && document.body) 
    {
      offsetBase = gw.offsetBase = document.createElement('div');
      offsetBase.style.cssText = 'position:absolute;left:0;top:0';
      document.body.appendChild(offsetBase);
    }
    
    if (elt && elt.ownerDocument === document && 'getBoundingClientRect' in elt && offsetBase) 
    {
      var boundingRect = elt.getBoundingClientRect();
      var baseRect = offsetBase.getBoundingClientRect();
      found = true;
      left = boundingRect.left - baseRect.left; //- document.documentElement.scrollLeft;
      top = boundingRect.top - baseRect.top; //- document.documentElement.scrollTop;
      width = boundingRect.right - boundingRect.left;
      height = boundingRect.bottom - boundingRect.top;
    }
    
    return { found: found, left: left, top: top, width: width, height: height, right: left + width, bottom: top + height };
  },

  copy: function(elt)
  {
    navigator.clipboard.writeText(elt.value)
      .then(() => {
        // Success!
      })
      .catch(err => {
        console.log('Unable to copy to the clipboard: ', err);
      });
  },
  /*ensureVisible: function(id, x, y, w, h)
  {
    var elt = typeof(id) == 'string' ? $(id) : id;
    var pw, ph,cx, cy, cw, ch;
    var xx, yy, ww, hh;
  
    // WW = W / 2
    ww = w / 2;
    //HH = H / 2
    hh = h / 2;
    // XX = X + WW
    xx = x + ww
    // YY = Y + HH
    yy = y + hh;
    
    // PW = Me.ClientW 
    // PH = Me.ClientH
    pw = elt.clientWidth;
    ph = elt.clientHeight;
    
    cx = - elt.scrollLeft;
    cy = - elt.scrollTop;
    cw = elt.scrollWidth;
    ch = elt.scrollHeight;
  
    //If PW < (WW * 2) Then WW = PW / 2
    //If PH < (HH * 2) Then HH = PH / 2
    if (pw < (ww * 2)) ww = pw / 2;
    if (ph < (hh * 2)) hh = ph / 2;
  
    //If CW <= PW Then
    //  WW = 0
    //  CX = 0
    //Endif
    if (cw <= pw) { ww = 0; cx = 0; }
    
    //If CH <= PH Then
    //  HH = 0
    //  CY = 0
    //Endif
    if (ch <= ph) { hh = 0; cy = 0 }
  
    //If XX < (- CX + WW) Then
    //  CX = Ceil(- XX + WW)
    //Else If XX >= (- CX + PW - WW) Then
    //  CX = Floor(- XX + PW - WW)
    //Endif
    if (xx < (- cx + ww))
      cx = - xx + ww;
    else if (xx >= (- cx + pw - ww))
      cx = - xx + pw - ww;
    
    //If YY < (- CY + HH) Then
    //  CY = Ceil(- YY + HH)
    //Else If YY >= (- CY + PH - HH) Then
    //  CY = Floor(- YY + PH - HH)
    //Endif
    
    if (yy < (- cy + hh))
      cy = - yy + hh;
    else if (yy >= (- cy + ph - hh))
      cy = - yy + ph - hh;
  
    //If CX > 0
    //  CX = 0
    //Else If CX < (PW - CW) And If CW > PW Then
    //  CX = PW - CW
    //Endif
    if (cx > 0)
      cx = 0;
    else if (cx < (pw - cw) && cw > pw)
      cx = pw - cw;
  
    //If CY > 0 Then
    //  CY = 0
    //Else If CY < (PH - CH) And If CH > PH Then
    //  CY = PH - CH
    //Endif
    if (cy > 0)
      cy = 0;
    else if (cy < (ph - ch) && ch > ph)
      cy = ph - ch;
  
    //If $hHBar.Value = - CX And If $hVBar.Value = - CY Then Return True
    //Scroll(- CX, - CY)
    elt.scrollLeft = - cx;
    elt.scrollTop = - cy;
  },*/

  window: 
  {
    zIndex: 0,
    
    exist: function(id)
    {
      return gw.windows.indexOf(id) >= 0;
    },
    
    open: function(id, resizable, modal, minw, minh)
    {
      if (!gw.window.exist(id))
      {
        if (gw.windows.length == 0)
        {
          document.addEventListener('mousemove', gw.window.onMove);
          document.addEventListener('mouseup', gw.window.onUp);
          gw.log('document.addEventListener');
        }
        
        gw.windows.push(id);
        
        $(id).addEventListener('mousedown', gw.window.onMouseDown);
      }
      
      $(id).gw_resizable = resizable;
      $(id).gw_modal = modal;
      $(id).gw_popup = undefined;
      $(id).gw_transient = undefined;
      
      if (modal && $(id).gw_focus == undefined)
        $(id).gw_focus = gw.saveFocus();
      
      if (minw != undefined)
      {
        $(id).gw_minw = minw;
        $(id).gw_minh = minh;
      }
      else if ($(id).gw_minw == undefined)
      {
        $(id).gw_minw = $(id).offsetWidth;
        $(id).gw_minh = $(id).offsetHeight;
      }
      
      //console.log('gw.window.open: minw = ' + $(id).gw_minw + ' minh = ' + $(id).gw_minh);
      
      // Touch events 
      //pane.addEventListener('touchstart', onTouchDown);
      //document.addEventListener('touchmove', onTouchMove);
      //document.addEventListener('touchend', onTouchEnd);
      
      gw.window.refresh();
    },
    
    popup: function(id, resizable, control, transient, minw, minh)
    {
      var pos;
      
      if (!gw.window.exist(id))
      {
        if (gw.windows.length == 0)
        {
          document.addEventListener('mousemove', gw.window.onMove);
          document.addEventListener('mouseup', gw.window.onUp);
          gw.log('document.addEventListener');
        }
        
        gw.windows.push(id);
        
        $(id).addEventListener('mousedown', gw.window.onMouseDown);

        pos = gw.getPos($(control));
        //console.log(pos);
        
        /*$(id).style.left = pos.left + 'px';
        $(id).style.top = pos.bottom + 'px';*/
        if (transient)
          $(id).style.transform = 'translate(' + (pos.left|0) + 'px,' + (pos.top|0) + 'px)';
        else
          $(id).style.transform = 'translate(' + (pos.left|0) + 'px,' + (pos.bottom|0) + 'px)';
      }
      
      $(id).gw_resizable = resizable;
      $(id).gw_modal = true;
      $(id).gw_popup = true;
      $(id).gw_popup_transient = transient;
      
      if ($(id).gw_focus == undefined)
        $(id).gw_focus = gw.saveFocus();
      
      if (minw != undefined)
      {
        $(id).gw_minw = minw;
        $(id).gw_minh = minh;
      }
      else if ($(id).gw_minw == undefined)
      {
        $(id).gw_minw = $(id).offsetWidth;
        $(id).gw_minh = $(id).offsetHeight;
      }
      
      gw.window.refresh();
      
      $(id).scrollIntoView({behavior:"auto", block:"nearest"});      
    },

    close: function(id)
    {
      var i;
      
      $(id).removeEventListener('mousedown', gw.window.onMouseDown);
      
      i = gw.windows.indexOf(id);
      if (i >= 0)
      {
        gw.windows.splice(i, 1);
        gw.window.refresh();
      }
      
      if ($(id).gw_focus)
      {
        gw.restoreFocus($(id).gw_focus);
        $(id).gw_focus = undefined;
      }
      
      $(id).gw_minw = $(id).gw_minh = undefined;
    },
    
    refresh: function()
    {
      var i = 0;
      var zi;
      
      while (i < gw.windows.length)
      {
        if ($(gw.windows[i]))
        {
          zi = 11 + i * 2;
          if ($(gw.windows[i]).style.zIndex != zi)
            $(gw.windows[i]).style.zIndex = zi;
          i++;
        }
        else
          gw.windows.splice(i, 1);
      }
      
      gw.window.updateModal();
      
      if (gw.windows.length == 0)
      {
        gw.log('document.removeEventListener');
        document.removeEventListener('mousemove', gw.window.onMove);
        document.removeEventListener('mouseup', gw.window.onUp);
      }
      else
        gw.window.updateTitleBars();
    },
    
    updateTitleBars: function()
    {
      var i, win, last;
      
      for (i = 0; i < gw.windows.length; i++)
      {
        win = gw.windows[i];
        if ($(win).gw_popup)
          continue;
        $(win).addClass('gw-deactivated');
        $(win + '-titlebar').addClass('gw-deactivated');
        last = win;
      }
      
      if (last && !$(last).gw_popup)
      {
        $(last).removeClass('gw-deactivated');
        $(last + '-titlebar').removeClass('gw-deactivated');
      }
    },
    
    raise: function(id, send)
    {
      var i = gw.windows.indexOf(id);
      if (i < 0)
        return;
      
      gw.windows.splice(i, 1);
      gw.windows.push(id);
      
      for (i = 0; i < gw.windows.length; i++)
        $(gw.windows[i]).style.zIndex = 11 + i * 2;
        
      gw.window.updateTitleBars();
        
      if (send)
        gw.update('', '#windows', gw.windows);
    },
    
    updateModal: function()
    {
      var i, elt = $('gw-modal');
      
      for (i = gw.windows.length - 1; i >= 0; i--)
      {
        if ($(gw.windows[i]).gw_modal)
        {
          gw.window.zIndex = 10 + i * 2;
          elt.style.zIndex = 10 + i * 2;
          elt.style.display = 'block';
          /*if ($(gw.windows[i]).gw_popup)
            elt.style.opacity = '0';
          else
            elt.style.opacity = '';*/
          return;
        }
      }
      
      gw.window.zIndex = 0;
      elt.style.display = 'none';
    },
    
    center: function(id)
    {
      $(id).style.transform = 'translate(' + ((window.innerWidth - $(id).offsetWidth) / 2 | 0) + 'px,' + ((window.innerHeight - $(id).offsetHeight) / 2 | 0) + 'px)';
      gw.window.updateGeometry(id);
    },
    
    isMaximized: function(id)
    {
      return $(id).gw_save_geometry != undefined;
    },
    
    maximize: function(id)
    {
      var geom = $(id).gw_save_geometry;
      if (geom != undefined)
      {
        //$(id).style.left = geom[0];
        //$(id).style.top = geom[1];
        $(id).style.transform = geom[0]
        $(id).style.width = geom[1];
        $(id).style.height = geom[2];
        $(id).gw_save_geometry = undefined;
      }
      else
      {
        $(id).gw_save_geometry = [$(id).style.transform, $(id).style.width, $(id).style.height];
        $(id).style.transform = '';
        $(id).style.width = '100%';
        $(id).style.height = '100%';
      }
      gw.window.updateGeometry(id);
    },
    
    onMouseDown: function(e)
    {
      gw.window.onDown(e);
    },
    
    onDown: function(e)
    {
      var c, win;
      
      gw.window.context = undefined;
      
      if (e.target.className == 'gw-window-button')
        return;
        
      gw.window.onMove(e);
      
      c = gw.window.context;
      if (c == undefined)
        return; 
        
      if ($(c.id).gw_save_geometry)
        return;
        
      if (c.isMoving || c.isResizing)
      {
        gw.window.raise(c.id);
        gw.window.downEvent = e;
        e.preventDefault();
      }
    },
    
    onDownModal: function(transient)
    {
      var win = gw.windows[gw.windows.length - 1];
      
      if ($(win).gw_popup)
      {
        if (transient && !$(win).gw_popup_transient)
          return;
        gw.update(win, '#close');
      }
    },
    
    onMove: function(e) 
    {
      var i, id, elt, b, x, y, bx, by, bw, bh, th;
      var onTopEdge, onLeftEdge, onRightEdge, onBottomEdge, isResizing;
      var MARGINS = 6;
      
      if (gw.window.downEvent)
      {
        gw.window.context.cx = e.clientX;
        gw.window.context.cy = e.clientY;
        gw.window.animate();
        return;
      }
      
      gw.window.context = undefined;
      
      for (i = 0; i < gw.windows.length; i++)
      {
        id = gw.windows[gw.windows.length - i - 1];
        elt = $(id);
        
        if (elt.style.zIndex < gw.window.zIndex)
          continue;
        
        b = elt.getBoundingClientRect();
        
        bx = b.left; // - MARGINS;
        by = b.top; // - MARGINS;
        bw = b.width; // + MARGINS * 2;
        bh = b.height; // + MARGINS * 2;
        
        x = e.clientX - bx;
        y = e.clientY - by;
        
        //console.log(x + ',' + y + ' : ' + bx + ',' + by + ',' + bw + ',' + bh);
        
        if (x >= 0 && x < bw && y >= 0 && y < bh)
        {
          if (elt.gw_resizable)
          {
            onTopEdge = y < MARGINS;
            onLeftEdge = x < MARGINS;
            onRightEdge = x >= (bw - MARGINS);
            onBottomEdge = y >= (bh - MARGINS);
            
            isResizing = onTopEdge || onLeftEdge || onRightEdge || onBottomEdge;
          }
          else
            onTopEdge = onLeftEdge = onRightEdge = onBottomEdge = isResizing = false;
          
          if ($(id).gw_popup)
            th = 0;
          else
            th = $(id + '-titlebar').offsetHeight;
          isMoving = !isResizing && y < (th + MARGINS);
          
          gw.window.context = {
            id: id,
            x: b.left + window.scrollX,
            y: b.top + window.scrollY,
            cx: e.clientX,
            cy: e.clientY,
            w: b.width,
            h: b.height,
            isResizing: isResizing,
            isMoving: isMoving,
            onTopEdge: onTopEdge,
            onLeftEdge: onLeftEdge,
            onRightEdge: onRightEdge,
            onBottomEdge: onBottomEdge
            };
          gw.window.animate();
          break;
        }
      }
    },
    
    updateGeometry: function(id)
    {
      var b = $(id).getBoundingClientRect();
      gw.update(id, '#geometry', [ b.left + 'px', b.top + 'px', b.width + 'px', b.height + 'px', gw.window.isMaximized(id)]);
    },
    
    onUp: function(e)
    {
      var c = gw.window.context;
      
      gw.window.downEvent = undefined;
      
      if (c && (c.isMoving || c.isResizing))
      {
        var id = gw.window.context.id;
        gw.window.context = undefined;
        gw.window.raise(id, true);
        gw.window.updateGeometry(id);
      }
    },

    animate: function() 
    {
      var id, elt, c, e, x, y, w, h;
      var minWidth;
      var minHeight;
      
      //requestAnimationFrame(gw.window.animate);
      
      c = gw.window.context;
      if (!c) return;
    
      elt = $(c.id);
      minWidth = elt.gw_minw;
      minHeight = elt.gw_minh; //$(c.id + '-titlebar').offsetHeight + 2 + elt.gw_minh;
      e = gw.window.downEvent;
    
      if (c && c.isResizing && e)
      {
        if (c.onRightEdge)
          elt.style.width = Math.max(c.w + c.cx - e.clientX, minWidth) + 'px';
        
        if (c.onBottomEdge)
          elt.style.height = Math.max(c.h + c.cy - e.clientY, minHeight) + 'px';
    
        x = c.x;
        y = c.y;
    
        if (c.onLeftEdge) 
        {
          x = c.x + c.cx - e.clientX;
          w = c.x + c.w - x;
          if (w >= minWidth) 
          {
            elt.style.width = w + 'px';
            //elt.style.left = x + 'px'; 
            elt.style.transform = 'translate(' + x + 'px,' + y + 'px)';
            //c.x = x;
          }
        }
    
        if (c.onTopEdge) 
        {
          y = c.y + c.cy - e.clientY;
          h = c.y + c.h - y;
          if (h >= minHeight) 
          {
            elt.style.height = h + 'px';
            //elt.style.top = y + 'px'; 
            elt.style.transform = 'translate(' + x + 'px,' + y + 'px)';
          }
        }
    
        return;
      }
    
      if (c && c.isMoving && e)
      {
        /*elt.style.left = (Math.max(0, c.x + c.cx - e.clientX)) + 'px';
        elt.style.top = (Math.max(0, c.y + c.cy - e.clientY)) + 'px';*/
        elt.style.transform = 'translate(' + (Math.max(0, c.x + c.cx - e.clientX)) + 'px,' + (Math.max(0, c.y + c.cy - e.clientY)) + 'px)';
        return;
      }
    
      // This code executes when mouse moves without clicking
    
      if (c.onRightEdge && c.onBottomEdge || c.onLeftEdge && c.onTopEdge)
        elt.style.cursor = 'nwse-resize';
      else if (c.onRightEdge && c.onTopEdge || c.onBottomEdge && c.onLeftEdge)
        elt.style.cursor = 'nesw-resize';
      else if (c.onRightEdge || c.onLeftEdge)
        elt.style.cursor = 'ew-resize';
      else if (c.onBottomEdge || c.onTopEdge)
        elt.style.cursor = 'ns-resize';
      else
        elt.style.cursor = '';
    }
  },
  
  menu:
  {
    hide: function(elt)
    {
      elt.style.display = 'none';
      setTimeout(function() { elt.style.display = ''; }, 150);
    },
    
    click: function(name, event)
    {
      var id = gw.getTargetId(event.target);
      gw.update(name, '#click', id);
      event.stopPropagation();
    }
  },
  
  table:
  {
    selectRange: function(id, start, end, checked)
    {
      var i;
      var tr;
      
      if (end < start)
      {
        i = start;
        start = end;
        end = i;
      }
      
      for (i = start; i <= end; i++)
      {
        tr = $(id + ':' + i);
        if (checked)
          tr.addClass('gw-selected');
        else
          tr.removeClass('gw-selected');
      }
        
      gw.update(id, '!' + start + ':' + (end - start + 1), checked);
    },
  
    select: function(id, row, event)
    {
      var elt = $(id + ':' + row);
      var last = $(id).gw_current;
      var selected = !elt.hasClass('gw-selected');
      
      if (event)
      {
        if (event.shiftKey && last)
          gw.table.selectRange(id, last, row, selected);
        else
          gw.table.selectRange(id, row, row, selected);
      }
      else
      {
        if (last != undefined)
          $(id + ':' + last) && $(id + ':' + last).removeClass('gw-selected');
        elt.addClass('gw-selected');
        gw.update(id, '$' + row, null);
      }
      
      $(id).gw_current = row;
      
      $(id).addClass('gw-unselectable');
      setTimeout(function() { $(id).removeClass('gw-unselectable'); }, 0);
    },
    
    checkRange: function(id, start, end, checked)
    {
      var i;
      if (end < start)
      {
        i = start;
        start = end;
        end = i;
      }
      
      for (i = start; i <= end; i++)
        $(id + ':' + i).checked = checked;
        
      gw.update(id, '!' + start + ':' + (end - start + 1), checked);
    },
  
    check: function(id, row, event)
    {
      var elt = $(id + ':' + row);
      var checked = !elt.checked;
      var last = $(id).gw_current;
      var len;
      
      elt.focus();
      
      if (event && event.shiftKey && last)
        gw.table.checkRange(id, last, row, checked);
      else
        gw.table.checkRange(id, row, row, checked);
      
      if (event.target == elt)
        elt.checked = !checked;

      $(id).gw_current = row;

      $(id).addClass('gw-unselectable');
      setTimeout(function() { $(id).removeClass('gw-unselectable'); }, 0);
    },
    
    /*toggle: function(id, row)
    {
      gw.update(id, '?' + row, false);
    },*/
    
    onScroll: function(id, more, timeout)
    {
      var elt = $(id);
      
      if (!elt)
        return;
      
      var sw = elt.firstChild;
      var last = elt.gw_last_scroll;
      
      if (last && last[0] == sw.scrollLeft && last[1] == sw.scrollTop)
        return;
      
      elt.gw_last_scroll = [sw.scrollLeft, sw.scrollTop];
      
      console.log('gw.table.onScroll: ' + id + ' ' + sw.scrollLeft + ',' + sw.scrollTop);
      
      if (more)
      {
        //if ((sw.scrollHeight - sw.scrollTop) === (sw.clientHeight))
        if (sw.scrollTop >= (sw.scrollHeight - sw.clientHeight - 16))
        {
          /*var wait = document.createElement('div');
          wait.className = 'gw-waiting';
          elt.appendChild(wait);*/
          if (elt.gw_scroll)
          {
            clearTimeout(elt.gw_scroll); 
            elt.gw_scroll = undefined;
          }
          
          gw.update(id, '#more', [sw.scrollLeft, sw.scrollTop]);
          return;
        }
      }
      
      if (elt.gw_headerh)
        $(elt.gw_headerh).firstChild.scrollLeft = sw.scrollLeft;

      if (elt.gw_headerv)
        $(elt.gw_headerv).firstChild.scrollTop = sw.scrollTop;

      if (elt.gw_noscroll)
      {
        elt.gw_noscroll = undefined;
        return;
      }
      
      if (elt.gw_scroll)
        clearTimeout(elt.gw_scroll); 
      
      elt.gw_scroll = setTimeout(function()
        { 
          var pos = [sw.scrollLeft, sw.scrollTop];
          
          console.log('gw.table.onScroll (timer): ' + id + ' ' + sw.scrollLeft + ',' + sw.scrollTop);
          clearTimeout(elt.gw_scroll); 
          
          gw.update(elt.id, '#scroll', pos, function() 
            { 
              elt.gw_scroll = undefined; 
              if (pos[0] != sw.scrollLeft || pos[1] != sw.scrollTop)
                gw.table.onScroll(id, more, timeout);
            });
            
          //elt.gw_scroll = undefined;
        }, timeout || 250);
    },
    
    scroll: function(id, x, y)
    {
      var sw = $(id).firstChild
      
      console.log("gw.table.scroll: " + id + ": " + x + " " + y);
      
      if (x != sw.scrollLeft)
      {
        $(id).gw_noscroll = true;
        sw.scrollLeft = x;
      }
      if (y != sw.scrollTop)
      {
        $(id).gw_noscroll = true;
        sw.scrollTop = y;
      }
      if (x != sw.scrollLeft || y != sw.scrollTop)
        gw.update(id, '#scroll', [sw.scrollLeft, sw.scrollTop]); 
    },
    
    ensureVisible: function(id, row)
    {
      var sw = $(id).firstChild;
      gw.table.scroll(id, sw.scrollLeft, $(id + ':' + row).offsetTop - sw.clientHeight / 2);
    }
  },
  
  scrollview:
  {
    setHeaders: function(id, hid, vid)
    {
      $(id).gw_headerh = hid;
      $(id).gw_headerv = vid;
    },

    ensureVisible: function(id, child)
    {
      var sw = $(id).firstChild;
      child = $(child);
      gw.table.scroll(id, child.offsetLeft - (sw.clientWidth - child.offsetWidth) / 2, child.offsetTop - (sw.clientHeight - child.offsetHeight) / 2);
    }
  },
  
  file: 
  {
    select: function(id) 
    {
      var elt = $(id + ':file');
      
      if ($(id).gw_uploading)
        return;
      
      elt.focus();
      elt.click();
    },
    
    finish: function(xhr)
    {
      if (xhr.gw_progress)
      {
        setTimeout(function() { gw.file.finish(xhr); }, 250);
        return;
      }
      
      gw.update(xhr.gw_id, 'progress', 1, function() {
        gw.answer(xhr); 
        gw.uploads[xhr.gw_id] = undefined;
        //gw.update(xhr.gw_id, 'finish', []);
        xhr.gw_id = undefined;
        });
    },
    
    upload: function(id, key)
    {
      var elt = $(id + ':file');
      var file = elt.files[0];
      var xhr = new XMLHttpRequest();
      var form = new FormData();
      
      if (gw.uploads[id])
        return;
      
      gw.uploads[id] = xhr;
      
      //gw.log('gw.file.upload: ' + id + ': ' + file.name);
      
      //xhr.gw_progress = 0;
      
      xhr.gw_progress = 1;
      gw.update(id, 'progress', 0, function() { xhr.gw_progress--; });
      
      form.append('file', file);
      form.append('name', file.name);
      form.append('id', id);
      
      //xhr.upload.addEventListener("loadstart", loadStartFunction, false);  
      //xhr.upload.addEventListener("load", transferCompleteFunction, false);
      
      xhr.upload.addEventListener('progress', 
        function(e) 
        {
          //console.log('upload: progress ' + e.loaded + ' / ' + e.total + ' ' + xhr.gw_id + ' ' + e.lengthComputable + ' ' + xhr.gw_progress);
          
          if (xhr.gw_id == undefined)
            return;
            
          if (e.lengthComputable)
          {
            var t = (new Date()).getTime();
            
            if ((xhr.gw_time == undefined || (t - xhr.gw_time) > 50) && xhr.gw_progress == 0)
            {
              xhr.gw_progress++;
              gw.update(xhr.gw_id, 'progress', e.loaded / e.total, function() { xhr.gw_progress--; }); 
              xhr.gw_time = t;
            }
          }
        },
        false);
      
      xhr.gw_command = ['upload', id];
      xhr.gw_id = id;
        
      xhr.open('POST', $root + '/upload:' + key, true);  
      
      xhr.onreadystatechange = function() 
        {
          if (xhr.readyState == 4)
            gw.file.finish(xhr);
        };
        
      xhr.send(form);  
    },
    
    abort: function(id)
    {
      if (gw.uploads[id])
        gw.uploads[id].abort();
    }
  },

  autocomplete: function(id)
  {
    new AutoComplete({
      selector: $(id + ':entry'),
      cache: false,
      source: function(term, response) {
        var xhr = $(id).gw_xhr;
        if (xhr)
        {
          try { xhr.abort(); } catch(e) {}
        }
        
        $(id).gw_xhr = xhr = new XMLHttpRequest();
        
        xhr.open('GET', $root + '/x?c=' + encodeURIComponent(JSON.stringify(['raise', id, 'completion', [term]])), true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState == 4)
          {
            gw.autocompletion = [];
            gw.answer(xhr);
            response(gw.autocompletion);
          }
        };
        xhr.send();
      },
      onSelect: function(e, term, item) {
        gw.textbox.setText(id, gw.textbox.getText(id));
      }
    });
  },
  
  textbox:
  {
    onactivate: function(id, e)
    {
      if (e.keyCode == 13)
        setTimeout(function() { gw.update(id, 'text', $(id + ':entry').value); gw.raise(id, 'activate', [], false); }, 20);
    },
    
    onchange: function(id)
    {
      if ($(id).gw_timer) clearTimeout($(id).gw_timer);
      $(id).gw_timer = setTimeout(function() { gw.update(id, 'change', $(id + ':entry').value, null); }, 20);
    },
    
    getText: function(id)
    {
      return $(id + ':entry').value;
    },
    
    setText: function(id, text)
    {
      gw.command(function() {
        $(id + ':entry').value = text;
        gw.setSelection($(id + ':entry'), [text.length, text.length]);
        gw.update(id, 'text', text);
        });
    },
    
    clear: function(id)
    {
      gw.textbox.setText(id, '');
      gw.setFocus(id);
      gw.raise(id, 'activate', [], false);
    },
    
    copy: function(id)
    {
      gw.copy($(id + ':entry'));
    }
  },

  textarea:
  {
    onchange: function(id)
    {
      if ($(id).gw_timer) clearTimeout($(id).gw_timer);
      $(id).gw_timer = setTimeout(function() { gw.update(id, 'change', $(id).value, null); }, 50);
    },
    
    copy: function(id)
    {
      gw.copy($(id));
    }
  },
  
  button:
  {
    setText: function(id, text)
    {
      $(id).lastElementChild.innerHTML = text;
    }
  },
  
  combobox:
  {
    resize: function(id)
    {
      $(id + ':select').onmouseover = function() { $(id + ':select').style.width = $(id).offsetWidth + 'px'; }
    },
    
    update: function(id, index, text)
    {
      if (text != undefined)
        $(id + ':entry').value = text;
        
      $(id + ':select').selectedIndex = index;
    }
  },
  
  listbox:
  {
    selectRange: function(id, start, end, checked)
    {
      var items = $(id).children;
      var i;
      var elt;
      
      if (end < start)
      {
        i = start;
        start = end;
        end = i;
      }
      
      for (i = start; i <= end; i++)
      {
        elt = items[i];
        if (checked)
          elt.addClass('gw-selected');
        else
          elt.removeClass('gw-selected');
      }
        
      gw.update(id, checked ? '+' : '-',  [start, end - start + 1]);
    },
  
    select: function(id, row, event, multiple)
    {
      var items = $(id).children;
      var elt = items[row];
      var last = $(id).gw_current;
      var selected = !elt.hasClass('gw-selected');
      
      if (event.detail == 2)
        return;
      
      if (multiple)
      {
        if (event.shiftKey && last)
          gw.listbox.selectRange(id, last, row, selected);
        else
          gw.listbox.selectRange(id, row, row, selected);
      }
      else
      {
        if (last != undefined)
          items[last] && items[last].removeClass('gw-selected');
        elt.addClass('gw-selected');
        gw.update(id, '$', row);
      }
      
      $(id).gw_current = row;
      
      /*$(id).addClass('gw-unselectable');
      setTimeout(function() { $(id).removeClass('gw-unselectable'); }, 0);*/
    }
  }
}


/*
    JavaScript autoComplete v1.0.4
    Copyright (c) 2014 Simon Steinberger / Pixabay
    GitHub: https://github.com/Pixabay/JavaScript-autoComplete
    License: http://www.opensource.org/licenses/mit-license.php
*/

var AutoComplete = (function(){
    // "use strict";
    function AutoComplete(options){
        if (!document.querySelector) return;

        // helpers
        function hasClass(el, className){ return el.classList ? el.classList.contains(className) : new RegExp('\\b'+ className+'\\b').test(el.className); }

        function addEvent(el, type, handler){
            if (el.attachEvent) el.attachEvent('on'+type, handler); else el.addEventListener(type, handler);
        }
        function removeEvent(el, type, handler){
            // if (el.removeEventListener) not working in IE11
            if (el.detachEvent) el.detachEvent('on'+type, handler); else el.removeEventListener(type, handler);
        }
        function live(elClass, event, cb, context){
            addEvent(context || document, event, function(e){
                var found, el = e.target || e.srcElement;
                while (el && !(found = hasClass(el, elClass))) el = el.parentElement;
                if (found) cb.call(el, e);
            });
        }

        var o = {
            selector: 0,
            source: 0,
            minChars: 3,
            delay: 150,
            offsetLeft: 0,
            offsetTop: 1,
            cache: 1,
            menuClass: '',
            renderItem: function (item, search){
                // escape special characters
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
                return '<div class="gw-ac-suggestion" data-val="' + item.replace(/"/g, '&quot;') + '">' + item.replace(re, "<b>$1</b>") + '</div>';
            },
            onSelect: function(e, term, item){}
        };
        for (var k in options) { if (options.hasOwnProperty(k)) o[k] = options[k]; }

        // init
        var elems = typeof o.selector == 'object' ? [o.selector] : document.querySelectorAll(o.selector);
        for (var i=0; i<elems.length; i++) {
            var that = elems[i];

            // create suggestions container "sc"
            that.sc = document.createElement('div');
            that.sc.className = 'gw-ac-suggestions '+o.menuClass;

            that.autocompleteAttr = that.getAttribute('autocomplete');
            that.setAttribute('autocomplete', 'off');
            that.cache = {};
            that.last_val = '';

            that.updateSC = function(resize, next){
                var rect = that.getBoundingClientRect();
                that.sc.style.left = Math.round(rect.left + (window.pageXOffset || document.documentElement.scrollLeft) + o.offsetLeft) + 'px';
                that.sc.style.top = Math.round(rect.bottom + (window.pageYOffset || document.documentElement.scrollTop) + o.offsetTop) + 'px';
                that.sc.style.width = Math.round(rect.right - rect.left) + 'px'; // outerWidth
                if (!resize) {
                    that.sc.style.display = 'block';
                    if (!that.sc.maxHeight) { that.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(that.sc, null) : that.sc.currentStyle).maxHeight); }
                    if (!that.sc.suggestionHeight) that.sc.suggestionHeight = that.sc.querySelector('.gw-ac-suggestion').offsetHeight;
                    if (that.sc.suggestionHeight)
                        if (!next) that.sc.scrollTop = 0;
                        else {
                            var scrTop = that.sc.scrollTop, selTop = next.getBoundingClientRect().top - that.sc.getBoundingClientRect().top;
                            if (selTop + that.sc.suggestionHeight - that.sc.maxHeight > 0)
                                that.sc.scrollTop = selTop + that.sc.suggestionHeight + scrTop - that.sc.maxHeight;
                            else if (selTop < 0)
                                that.sc.scrollTop = selTop + scrTop;
                        }
                }
            }
            addEvent(window, 'resize', that.updateSC);
            document.body.appendChild(that.sc);

            live('gw-ac-suggestion', 'mouseleave', function(e){
                var sel = that.sc.querySelector('.gw-ac-suggestion.selected');
                if (sel) setTimeout(function(){ sel.className = sel.className.replace('selected', ''); }, 20);
            }, that.sc);

            live('gw-ac-suggestion', 'mouseover', function(e){
                var sel = that.sc.querySelector('.gw-ac-suggestion.selected');
                if (sel) sel.className = sel.className.replace('selected', '');
                this.className += ' selected';
            }, that.sc);

            live('gw-ac-suggestion', 'mousedown', function(e){
                if (hasClass(this, 'gw-ac-suggestion')) { // else outside click
                    var v = this.getAttribute('data-val');
                    that.value = v;
                    o.onSelect(e, v, this);
                    that.sc.style.display = 'none';
                }
            }, that.sc);

            that.blurHandler = function(){
                try { var over_sb = document.querySelector('.gw-ac-suggestions:hover'); } catch(e){ var over_sb = 0; }
                if (!over_sb) {
                    that.last_val = that.value;
                    that.sc.style.display = 'none';
                    setTimeout(function(){ that.sc.style.display = 'none'; }, 350); // hide suggestions on fast input
                } else if (that !== document.activeElement) setTimeout(function(){ that.focus(); }, 20);
            };
            addEvent(that, 'blur', that.blurHandler);

            var suggest = function(data){
                var val = that.value;
                that.cache[val] = data;
                if (data.length && val.length >= o.minChars) {
                    var s = '';
                    for (var i=0;i<data.length;i++) s += o.renderItem(data[i], val);
                    that.sc.innerHTML = s;
                    that.updateSC(0);
                }
                else
                    that.sc.style.display = 'none';
            }

            that.keydownHandler = function(e){
                var key = window.event ? e.keyCode : e.which;
                // down (40), up (38)
                if ((key == 40 || key == 38) && that.sc.innerHTML) {
                    var next, sel = that.sc.querySelector('.gw-ac-suggestion.selected');
                    if (!sel) {
                        next = (key == 40) ? that.sc.querySelector('.gw-ac-suggestion') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
                        next.className += ' selected';
                        that.value = next.getAttribute('data-val');
                    } else {
                        next = (key == 40) ? sel.nextSibling : sel.previousSibling;
                        if (next) {
                            sel.className = sel.className.replace('selected', '');
                            next.className += ' selected';
                            that.value = next.getAttribute('data-val');
                        }
                        else { sel.className = sel.className.replace('selected', ''); that.value = that.last_val; next = 0; }
                    }
                    that.updateSC(0, next);
                    return false;
                }
                // esc
                else if (key == 27) { that.value = that.last_val; that.sc.style.display = 'none'; }
                // enter
                else if (key == 13 || key == 9) {
                    var sel = that.sc.querySelector('.gw-ac-suggestion.selected');
                    if (sel && that.sc.style.display != 'none') { 
                      o.onSelect(e, sel.getAttribute('data-val'), sel); setTimeout(function(){ that.sc.style.display = 'none'; }, 20); 
                      e.preventDefault();
                      }
                }
            };
            addEvent(that, 'keydown', that.keydownHandler);

            that.keyupHandler = function(e){
                var key = window.event ? e.keyCode : e.which;
                if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
                    var val = that.value;
                    if (val.length >= o.minChars) {
                        if (val != that.last_val) {
                            that.last_val = val;
                            clearTimeout(that.timer);
                            if (o.cache) {
                                if (val in that.cache) { suggest(that.cache[val]); return; }
                                // no requests if previous suggestions were empty
                                for (var i=1; i<val.length-o.minChars; i++) {
                                    var part = val.slice(0, val.length-i);
                                    if (part in that.cache && !that.cache[part].length) { suggest([]); return; }
                                }
                            }
                            that.timer = setTimeout(function(){ o.source(val, suggest) }, o.delay);
                        }
                    } else {
                        that.last_val = val;
                        that.sc.style.display = 'none';
                    }
                }
            };
            addEvent(that, 'keyup', that.keyupHandler);

            that.focusHandler = function(e){
                that.last_val = '\n';
                that.keyupHandler(e)
            };
            if (!o.minChars) addEvent(that, 'focus', that.focusHandler);
        }

        // public destroy method
        this.destroy = function(){
            for (var i=0; i<elems.length; i++) {
                var that = elems[i];
                removeEvent(window, 'resize', that.updateSC);
                removeEvent(that, 'blur', that.blurHandler);
                removeEvent(that, 'focus', that.focusHandler);
                removeEvent(that, 'keydown', that.keydownHandler);
                removeEvent(that, 'keyup', that.keyupHandler);
                if (that.autocompleteAttr)
                    that.setAttribute('autocomplete', that.autocompleteAttr);
                else
                    that.removeAttribute('autocomplete');
                document.body.removeChild(that.sc);
                that = null;
            }
        };
    }
    return AutoComplete;
})();

(function(){
    if (typeof define === 'function' && define.amd)
        define('AutoComplete', function () { return AutoComplete; });
    else if (typeof module !== 'undefined' && module.exports)
        module.exports = AutoComplete;
    else
        window.AutoComplete = AutoComplete;
})();

