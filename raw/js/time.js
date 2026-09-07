setInterval(() => {
  timer();
}, 1000);

const timer = () => {
  var date = new Date();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();
  var day = date.getDate();
  var h = date.getHours();
  var m = date.getMinutes();
  var s = date.getSeconds();
  if (h < 10) h = "0" + h;
  if (m < 10) m = "0" + m;
  if (s < 10) s = "0" + s;
  if (day < 10) day = "0" + day;
  if (month < 10) month = "0" + month;
  document.getElementById("myTime").innerHTML =
    h + ":" + m + ":" + s + "      " + day + "/" + month + "/" + year;
  // timedata.value = new Date();
};