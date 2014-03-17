/**
  * NodeChat node.js
  * simple publish subscribe helper
  * author: Deni Spasovski
  */
(function(){
  var subsriptions = {};
  /**
  * adds event listener
  *
  * @param {String} eventName
  * @param {Function} fn
  * @param {String} subsriptionId - optional
  * @api public
  */
  var subscribe = function _subscribe(eventName, fn, subsriptionId){
    if(subsriptions[eventName] == null){
      subsriptions[eventName] = [];
    }
    subsriptions[eventName].push({fn: fn, subsriptionId: subsriptionId});
  }

  /**
  * removes event listener
  *
  * @param {String} eventName
  * @param {String} subsriptionId
  * @api public
  */
  var unsubscribe = function _unsubscribe(eventName, subsriptionId){
    if(subsriptions[eventName] != null){
      for(var i = subsriptions[eventName].length - 1; i>0; i--){
        if(subsriptions[eventName][i].subsriptionId == subsriptionId)
          subsriptions[eventName].splice(i, 1);
      }
    }
    subsriptions[eventName].push({fn: fn, subsriptionId: subsriptionId});
  }

  /**
  * trigger event
  *
  * @param {String} eventName
  * @param {Object} data
  * @api public
  */
  var publish = function _publish(eventName, data){
    if(subsriptions[eventName]!= null){
      for(var i=0; i<subsriptions[eventName].length; i++){
        subsriptions[eventName][i].fn(data);
      }
    }
  }

  module.exports.publish = publish;
  module.exports.subscribe = subscribe;
  module.exports.unsubscribe = unsubscribe;
})();