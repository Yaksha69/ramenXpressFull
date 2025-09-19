class PhilippinesAddresses {
  static const Map<String, Map<String, List<String>>> addressData = {
    'Batangas': {
      'Balayan': [
        'Barangay 1 (Poblacion)',
        'Barangay 2 (Poblacion)',
        'Barangay 3 (Poblacion)',
        'Barangay 4 (Poblacion)',
        'Barangay 5 (Poblacion)',
        'Barangay 6 (Poblacion)',
        'Barangay 7 (Poblacion)',
        'Barangay 8 (Poblacion)',
        'Barangay 9 (Poblacion)',
        'Barangay 10 (Poblacion)',
        'Barangay 11 (Poblacion)',
        'Barangay 12 (Poblacion)',
        'Calan',
        'Caloocan',
        'Canda',
        'Carenahan',
        'Caybunga',
        'Dalig',
        'Dao',
        'Duhatan',
        'Durungao',
        'Gimalas',
        'Lagnas',
        'Lanatan',
        'Lucban Putol',
        'Lucban Pook',
        'Navotas',
        'Patugo',
        'Sambat',
        'San Juan',
        'San Piro',
        'Sukol',
        'Tactac'
      ],
    },
  };

  static List<String> getProvinces() {
    final provinces = addressData.keys.toList();
    provinces.sort();
    return provinces;
  }

  static List<String> getCities(String province) {
    final cities = addressData[province]?.keys.toList() ?? [];
    cities.sort();
    return cities;
  }

  static List<String> getBarangays(String province, String city) {
    return addressData[province]?[city] ?? [];
  }
}
