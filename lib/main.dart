import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_gemini/flutter_gemini.dart';

Future<void> main() async {

  await dotenv.load(fileName:('.env'));
  String apiKey = dotenv.env['GEMINI_API_KEY'] ?? 'INVALID';
  log(apiKey);
  Gemini.init(apiKey: apiKey);

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FengFeng GPT Home',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'FengFeng\'s GPT'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // This widget is the home page of your application. It is stateful, meaning
  // that it has a State object (defined below) that contains fields that affect
  // how it looks.

  // This class is the configuration for the state. It holds the values (in this
  // case the title) provided by the parent (in this case the App widget) and
  // used by the build method of the State. Fields in a Widget subclass are
  // always marked "final".

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;
  String _response = "";
  List<Content> chatList = [];

  final TextEditingController _controller = TextEditingController();

  void _onFabPressed() {
    setState(() {
      _counter++;
    });

    final gemini = Gemini.instance;

    String inputText = _controller.text;
    _controller.clear();

    gemini.text(inputText).then((value) {
      setState(() {
        _response = "$_response\n${value?.content?.parts?.first.text}";
      });
    }).catchError((e) {
      setState(() {
        _response = "$_response\n${e.runtimeType.toString()}";
      });
      log('streamGenerateContent exception', error: e);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: SingleChildScrollView(
            child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              _response,
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        )),
      ),
      bottomNavigationBar: BottomAppBar(
          child: Row(
        children: [
          Expanded(
              child: TextField(
            controller: _controller,
            decoration: const InputDecoration(border: OutlineInputBorder()),
            textInputAction: TextInputAction.done,
            onEditingComplete: _onFabPressed,
          )),
          const SizedBox(width: 12),
          FloatingActionButton(
            onPressed: _onFabPressed,
            tooltip: 'Increment',
            child: const Icon(Icons.add),
          )
        ],
      )),
      floatingActionButtonLocation: FloatingActionButtonLocation.endContained,
    );
  }
}
