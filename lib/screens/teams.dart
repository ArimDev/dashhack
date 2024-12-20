import 'package:flutter/material.dart';
import '../widgets/teamCard.dart';
import '../widgets/addTeam.dart';
import '../widgets/editTeam.dart';

class TeamsScreen extends StatefulWidget {
  const TeamsScreen({super.key});

  @override
  State<TeamsScreen> createState() => _TeamsScreenState();
}

class _TeamsScreenState extends State<TeamsScreen> {
  final List<Team> _teams = [];
  final List<Team> _filteredTeams = [];
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _filteredTeams.addAll(_teams);
  }

  void _addTeam() async {
    final newTeam = await showDialog<Team>(
      context: context,
      builder: (BuildContext context) => const AddTeamDialog(),
    );

    if (newTeam != null) {
      setState(() {
        _teams.add(newTeam);
        _updateFilteredTeams();
      });
    }
  }

  void _editTeam(int index) async {
    final updatedTeam = await showDialog<Team>(
      context: context,
      builder: (BuildContext context) =>
          EditTeamDialog(team: _filteredTeams[index]),
    );

    if (updatedTeam != null) {
      setState(() {
        final originalIndex = _teams.indexOf(_filteredTeams[index]);
        _teams[originalIndex] = updatedTeam;
        _updateFilteredTeams();
      });
    }
  }

  void _updateFilteredTeams() {
    setState(() {
      _filteredTeams.clear();
      _filteredTeams.addAll(_teams.where(
        (team) => team.name.toLowerCase().contains(_searchQuery.toLowerCase()),
      ));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: SearchAnchor(
            builder: (BuildContext context, SearchController controller) {
              return SearchBar(
                controller: controller,
                hintText: "Search Teams...",
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value;
                    _updateFilteredTeams();
                  });
                },
                trailing: const [Icon(Icons.search)],
                backgroundColor: WidgetStateProperty.all(Colors.white),
              );
            },
            suggestionsBuilder:
                (BuildContext context, SearchController controller) {
              final suggestions = _teams
                  .where((team) => team.name
                      .toLowerCase()
                      .contains(controller.text.toLowerCase()))
                  .toList();

              return suggestions.map((team) {
                return ListTile(
                  title: Text(team.name),
                  onTap: () {
                    controller.closeView(team.name);
                    setState(() {
                      _searchQuery = team.name;
                      _updateFilteredTeams();
                    });
                  },
                );
              });
            },
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(8),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3, // Tři sloupce
              mainAxisSpacing: 8, // Vzdálenost mezi řádky
              crossAxisSpacing: 8, // Vzdálenost mezi sloupci
              childAspectRatio: 1.0, // Poměr stran (1:1 - čtvercové karty)
            ),
            itemCount: _filteredTeams.length,
            itemBuilder: (context, index) {
              return TeamCard(
                team: _filteredTeams[index],
                onEdit: () => _editTeam(index),
                onDelete: () {
                  setState(() {
                    final originalIndex = _teams.indexOf(_filteredTeams[index]);
                    _teams.removeAt(originalIndex);
                    _updateFilteredTeams();
                  });
                },
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: FloatingActionButton.extended(
            onPressed: _addTeam,
            label: const Text("Add Team",
                style: TextStyle(
                  color: Colors.white,
                )),
            icon: const Icon(
              Icons.add,
              color: Colors.white,
            ),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        ),
      ],
    );
  }
}

class Team {
  String name;
  Color color;
  String repository;

  Team({required this.name, required this.color, required this.repository});
}
