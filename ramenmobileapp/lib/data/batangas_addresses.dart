import 'Balayan.dart';
import 'Calaca.dart';
import 'Lemery.dart';
import 'Lian.dart';
import 'Nasugbu.dart';

class BatangasAddresses {
  static const String province = 'Batangas';
  
  static const List<String> municipalities = [
    'Balayan',
    'Calaca',
    'Lemery',
    'Lian',
    'Nasugbu'
  ];

  static String getProvince() {
    return province;
  }

  static List<String> getMunicipalities() {
    return List<String>.from(municipalities);
  }

  static List<String> getBarangays(String municipality) {
    switch (municipality) {
      case 'Balayan':
        return BalayanAddresses.getBarangays();
      case 'Calaca':
        return CalacaAddresses.getBarangays();
      case 'Lemery':
        return LemeryAddresses.getBarangays();
      case 'Lian':
        return LianAddresses.getBarangays();
      case 'Nasugbu':
        return NasugbuAddresses.getBarangays();
      default:
        return [];
    }
  }

  static bool isMunicipalityAvailable(String municipality) {
    return municipalities.contains(municipality);
  }

  static int getBarangayCount(String municipality) {
    return getBarangays(municipality).length;
  }
}
