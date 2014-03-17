/**
  * NodeChat node.js
  * author: Deni Spasovski
  */
(function(){
  /**
  * definition of chat user object
  *
  * @param {String} name
  */
  var chatUser = function _chatUser(name) {
    var _this = Object.create({});
    _this.name = name;
    _this.chatRooms = [];
    _this.hasJoinedRoom = function(roomName) {
      return (this.chatRooms.indexOf(roomName) >= 0);
    };
    _this.joinRoom = function(roomName, oneRoomLimit) {
      if (this.chatRooms.indexOf(roomName) < 0)
        this.chatRooms.push(roomName); 
    };
    _this.leaveRoom = function(roomName) {
      var _index = this.chatRooms.indexOf(roomName);
      if(_index >= 0)
        this.chatRooms.splice(_index, 1); 
    };
    return _this;
  }

  var userList = {};

  /**
  * factory pattern object creator
  *
  * @param {String} name
  * @api public
  */
  var createUser = function _createUser(name) {
    if(userList[name] != null)
      return null; //user exist
    var _newChatUser = new chatUser(name);
    userList[name] = _newChatUser;
    return _newChatUser;
  };
  module.exports.createUser = createUser;
  module.exports.userList = userList;
})();