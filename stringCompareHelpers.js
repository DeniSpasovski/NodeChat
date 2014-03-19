/**
  * NodeChat node.js
  * sting compare helper functions
  * author: Deni Spasovski
  */
(function(){
  /**
  * Checks if a string contains only Alphanumeric characters
  *
  * @param {String} message
  * @return{Boolean}
  */
  isAlphanumeric = function _isAlphanumeric (message){
    var validChar = /^[a-zA-Z0-9_]*$/;
    if (validChar.test(message))
      return true;
    else
      return false;
  }

  /**
    * checks if a string contains new line
    *
    * @param {String} message
    * @return{Boolean}
    */
  containsNewLine = function _containsNewLine(message){
    var validChar = /(\r\n|\n|\r)/;
    if (validChar.test(message))
      return true;
    else
      return false;
  }

  module.exports.isAlphanumeric = isAlphanumeric;
  module.exports.containsNewLine = containsNewLine;
})();