import 'package:flutter/material.dart';
import 'package:mobile_app/app/my_app.dart';

export 'package:mobile_app/app/my_app.dart' show MyApp;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}
