import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  final String projectName;
  final String projectPassword;

  const HomeScreen(
      {super.key, required this.projectName, required this.projectPassword});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        projectName,
        style: Theme.of(context).textTheme.headlineLarge,
      ),
    );
  }
}
