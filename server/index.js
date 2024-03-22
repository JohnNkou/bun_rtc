import { renderToString } from 'react-dom/server';
import Users from '../client/components/Users.js';

function App(){
	return <html>
		<head>
			<title>RTC</title>
		</head>
		<body>
			<div id='app'>
				<Users />
			</div>
			<script src='/bundle/index.js'></script>
		</body>
	</html>
}

export default App;