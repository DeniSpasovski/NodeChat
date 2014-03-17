(function(){
  var chatRoom = function _chatRoom(name) {
    var _this = Object.create({});
    _this.name = name;
    _this.users = [];
    _this.addUser = function(userName) {
      if (this.users.indexOf(userName) < 0)
        this.users.push(userName); 
    };
    _this.removeUser = function(userName) {
      var _index = this.users.indexOf(userName);
      if(_index >= 0)
        this.users.splice(_index, 1);  
    };
    return _this;
  };

  var chatRoomList = {};
  var createChatRoom = function _createChatRoom(name) {
    if(chatRoomList[name] != null)
      return null; //chat room exist
    var _newChatRoom = new chatRoom(name);
    chatRoomList[name] = _newChatRoom;
    return _newChatRoom;
  };
  module.exports.createChatRoom = createChatRoom;
  module.exports.chatRoomList = chatRoomList;
})();