var express = require('express'),
	app = express();

app.use(express.static(__dirname));

app.listen(8800);
console.log('Now listening on port 8800');
