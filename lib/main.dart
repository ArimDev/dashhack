import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import './landing.dart';
import './app.dart';

void main() {
  usePathUrlStrategy();
  runApp(const MyApp());
  SemanticsBinding.instance.ensureSemantics();
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hackathon Dashboard',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const LandingPage(),
        '/app': (context) => const AppPage(), // Replace with your AppPage
      },
    );
  }
}
