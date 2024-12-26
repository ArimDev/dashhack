import 'package:flutter/material.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import '../screens/teams.dart';

class EditTeamDialog extends StatefulWidget {
  final Team team;

  const EditTeamDialog({super.key, required this.team});

  @override
  State<EditTeamDialog> createState() => _EditTeamDialogState();
}

class _EditTeamDialogState extends State<EditTeamDialog> {
  late TextEditingController _nameController;
  late TextEditingController _repositoryController;
  late Color _selectedColor;

  void _changeColor(Color color) {
    setState(() {
      _selectedColor = color;
    });
  }

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.team.name);
    _repositoryController = TextEditingController(text: widget.team.repository);
    _selectedColor = widget.team.color;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Edit Team"),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: "Team Name"),
          ),
          TextField(
            controller: _repositoryController,
            decoration: const InputDecoration(labelText: "Repository URL"),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Choose Team Color:"),
              IconButton(
                icon: Icon(
                  Icons.color_lens,
                  color: _selectedColor,
                ),
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text("Pick a Color"),
                      content: SingleChildScrollView(
                        child: ColorPicker(
                          pickerColor: _selectedColor,
                          onColorChanged: _changeColor,
                          pickerAreaHeightPercent: 0.8,
                        ),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).pop();
                          },
                          child: const Text("Close"),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop(null);
          },
          child: const Text("Cancel"),
        ),
        ElevatedButton(
          onPressed: () {
            if (_nameController.text.isNotEmpty) {
              Navigator.of(context).pop(Team(
                name: _nameController.text,
                color: _selectedColor,
                repository: _repositoryController.text,
              ));
            }
          },
          child: const Text("Save"),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _repositoryController.dispose();
    super.dispose();
  }
}
