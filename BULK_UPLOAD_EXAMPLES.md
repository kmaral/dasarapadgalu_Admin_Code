# Bulk Upload Examples for Firebase Firestore Manager

## JSON Format Examples

### 1. SongDetails Collection

```json
[
  {
    "ArtistID": "0QNzLKiDxIGA7VS",
    "ArtistName": "S. P. Balasubrahmanyam",
    "CategoryID": "0f7kcxDYnvnyzStAx",
    "CategoryName": "Devotional",
    "SongGroup": "Morning Bhajans",
    "SongNameEN": "Om Namah Shivaya",
    "SongNameKN": "ಓಂ ನಮಃ ಶಿವಾಯ",
    "SongNameHI": "ॐ नमः शिवाय",
    "SongNameTE": "ఓం నమః శివాయ",
    "NextSongCount": 1
  },
  {
    "ArtistID": "1CDRlNssduu66BicLsHd",
    "ArtistName": "K. S. Chithra",
    "CategoryID": "1YOAIObiYq7ScJVKBecO0",
    "CategoryName": "Classical",
    "SongGroup": "Carnatic",
    "SongNameEN": "Jagadodharana",
    "SongNameKN": "ಜಗದೋದ್ಧಾರಣ",
    "SongNameHI": "जगदोद्धारण",
    "SongNameTE": "జగదోద్ధారణ",
    "NextSongCount": 2
  },
  {
    "ArtistID": "23qtp5MybaKgTKGoHmaM",
    "ArtistName": "Purandara Dasa",
    "CategoryID": "3xvPXrqPKbsGnrltTGwY",
    "CategoryName": "Folk",
    "SongGroup": "Festival Songs",
    "SongNameEN": "Venkateshwara Suprabhatam",
    "SongNameKN": "ವೆಂಕಟೇಶ್ವರ ಸುಪ್ರಭಾತಂ",
    "SongNameHI": "वेंकटेश्वर सुप्रभातम्",
    "SongNameTE": "వెంకటేశ్వర సుప్రభాతం",
    "NextSongCount": 5
  }
]
```

### 2. ArtistDetails Collection

```json
[
  {
    "ARTISTNAMEEN": "S. P. Balasubrahmanyam",
    "ARTISTSIGNEN": "SPB",
    "ARTISTNAMEKN": "ಎಸ್. ಪಿ. ಬಾಲಸುಬ್ರಹ್ಮಣ್ಯಂ",
    "ARTISTSIGNKA": "ಎಸ್ಪಿಬಿ",
    "SONGTYPE": 1,
    "ARTISTNAMEDESCRIPTIONKA": "ಪ್ರಸಿದ್ಧ ಪಾರ್ಶ್ವ ಗಾಯಕ"
  },
  {
    "ARTISTNAMEEN": "K. S. Chithra",
    "ARTISTSIGNEN": "Chithra",
    "ARTISTNAMEKN": "ಕೆ. ಎಸ್. ಚಿತ್ರಾ",
    "ARTISTSIGNKA": "ಚಿತ್ರಾ",
    "SONGTYPE": 1,
    "ARTISTNAMEDESCRIPTIONKA": "ಭಾರತೀಯ ಪಾರ್ಶ್ವ ಗಾಯಕಿ"
  },
  {
    "ARTISTNAMEEN": "Purandara Dasa",
    "ARTISTSIGNEN": "Purandara",
    "ARTISTNAMEKN": "ಪುರಂದರ ದಾಸ",
    "ARTISTSIGNKA": "ಪುರಂದರ",
    "SONGTYPE": 2,
    "ARTISTNAMEDESCRIPTIONKA": "ಕರ್ನಾಟಕ ಸಂಗೀತದ ಪಿತಾಮಹ"
  }
]
```

### 3. CategoryDetails Collection

```json
[
  {
    "CategoryNameEN": "Devotional",
    "CategoryNameKN": "ಭಕ್ತಿ ಗೀತೆಗಳು",
    "CategoryNameHI": "भक्ति गीत",
    "CategoryNameTE": "భక్తి పాటలు",
    "CategoryIcon": "https://example.com/icons/devotional.png",
    "DisplayOrder": 1
  },
  {
    "CategoryNameEN": "Classical",
    "CategoryNameKN": "ಶಾಸ್ತ್ರೀಯ ಸಂಗೀತ",
    "CategoryNameHI": "शास्त्रीय संगीत",
    "CategoryNameTE": "క్లాసికల్ సంగీతం",
    "CategoryIcon": "https://example.com/icons/classical.png",
    "DisplayOrder": 2
  },
  {
    "CategoryNameEN": "Folk Songs",
    "CategoryNameKN": "ಜಾನಪದ ಗೀತೆಗಳು",
    "CategoryNameHI": "लोक गीत",
    "CategoryNameTE": "జానపద పాటలు",
    "CategoryIcon": "https://example.com/icons/folk.png",
    "DisplayOrder": 3
  }
]
```

### 4. Languages Collection

```json
[
  {
    "LanguageNameEN": "Kannada",
    "LanguageNameNative": "ಕನ್ನಡ",
    "LanguageCode": "kn",
    "IsActive": true
  },
  {
    "LanguageNameEN": "Hindi",
    "LanguageNameNative": "हिन्दी",
    "LanguageCode": "hi",
    "IsActive": true
  },
  {
    "LanguageNameEN": "Telugu",
    "LanguageNameNative": "తెలుగు",
    "LanguageCode": "te",
    "IsActive": true
  },
  {
    "LanguageNameEN": "Tamil",
    "LanguageNameNative": "தமிழ்",
    "LanguageCode": "ta",
    "IsActive": false
  }
]
```

---

## CSV Format Examples

### 1. SongDetails.csv

```csv
ArtistID,ArtistName,CategoryID,CategoryName,SongGroup,SongNameEN,SongNameKN,SongNameHI,SongNameTE,NextSongCount
0QNzLKiDxIGA7VS,S. P. Balasubrahmanyam,0f7kcxDYnvnyzStAx,Devotional,Morning Bhajans,Om Namah Shivaya,ಓಂ ನಮಃ ಶಿವಾಯ,ॐ नमः शिवाय,ఓం నమః శివాయ,1
1CDRlNssduu66BicLsHd,K. S. Chithra,1YOAIObiYq7ScJVKBecO0,Classical,Carnatic,Jagadodharana,ಜಗದೋದ್ಧಾರಣ,जगदोद्धारण,జగదోద్ధారణ,2
23qtp5MybaKgTKGoHmaM,Purandara Dasa,3xvPXrqPKbsGnrltTGwY,Folk,Festival Songs,Venkateshwara Suprabhatam,ವೆಂಕಟೇಶ್ವರ ಸುಪ್ರಭಾತಂ,वेंकटेश्वर सुप्रभातम्,వెంకటేశ్వర సుప్రభాతం,5
```

### 2. ArtistDetails.csv

```csv
ARTISTNAMEEN,ARTISTSIGNEN,ARTISTNAMEKN,ARTISTSIGNKA,SONGTYPE,ARTISTNAMEDESCRIPTIONKA
S. P. Balasubrahmanyam,SPB,ಎಸ್. ಪಿ. ಬಾಲಸುಬ್ರಹ್ಮಣ್ಯಂ,ಎಸ್ಪಿಬಿ,1,ಪ್ರಸಿದ್ಧ ಪಾರ್ಶ್ವ ಗಾಯಕ
K. S. Chithra,Chithra,ಕೆ. ಎಸ್. ಚಿತ್ರಾ,ಚಿತ್ರಾ,1,ಭಾರತೀಯ ಪಾರ್ಶ್ವ ಗಾಯಕಿ
Purandara Dasa,Purandara,ಪುರಂದರ ದಾಸ,ಪುರಂದರ,2,ಕರ್ನಾಟಕ ಸಂಗೀತದ ಪಿತಾಮಹ
```

### 3. CategoryDetails.csv

```csv
CategoryNameEN,CategoryNameKN,CategoryNameHI,CategoryNameTE,CategoryIcon,DisplayOrder
Devotional,ಭಕ್ತಿ ಗೀತೆಗಳು,भक्ति गीत,భక్తి పాటలు,https://example.com/icons/devotional.png,1
Classical,ಶಾಸ್ತ್ರೀಯ ಸಂಗೀತ,शास्त्रीय संगीत,క్లాసికల్ సంగీతం,https://example.com/icons/classical.png,2
Folk Songs,ಜಾನಪದ ಗೀತೆಗಳು,लोक गीत,జానపద పాటలు,https://example.com/icons/folk.png,3
```

### 4. Languages.csv

```csv
LanguageNameEN,LanguageNameNative,LanguageCode,IsActive
Kannada,ಕನ್ನಡ,kn,true
Hindi,हिन्दी,hi,true
Telugu,తెలుగు,te,true
Tamil,தமிழ்,ta,false
```

---

## Important Notes

### JSON Format:
- Must be a valid JSON array `[...]` containing objects
- Each object represents one document
- Field names must match exactly (case-sensitive)
- Boolean values: `true` or `false` (lowercase, no quotes)
- Numbers: No quotes around numeric values
- Strings: Always use quotes

### CSV Format:
- First row must contain field names (header row)
- Values with commas must be enclosed in double quotes
- Multi-language text is supported
- Boolean values: use `true` or `false` (lowercase)
- Empty cells are treated as empty strings

### Field Requirements by Collection:

**SongDetails** (Recommended fields):
- ArtistID, ArtistName
- CategoryID, CategoryName
- SongGroup
- SongNameEN, SongNameKN, SongNameHI, SongNameTE
- NextSongCount

**ArtistDetails** (Recommended fields):
- ARTISTNAMEEN, ARTISTSIGNEN
- ARTISTNAMEKN, ARTISTSIGNKA
- SONGTYPE
- ARTISTNAMEDESCRIPTIONKA

**CategoryDetails** (Recommended fields):
- CategoryNameEN, CategoryNameKN, CategoryNameHI, CategoryNameTE
- CategoryIcon
- DisplayOrder

**Languages** (Required fields):
- LanguageNameEN, LanguageNameNative
- LanguageCode
- IsActive

## How to Use

1. **Choose your format**: JSON or CSV
2. **Copy the appropriate example** for your collection
3. **Modify the data** with your actual values
4. **Save the file** with proper extension (`.json` or `.csv`)
5. **In the app**: Click "Bulk Upload" button
6. **Select your file** and upload
7. **Verify** the success message shows the correct count

## Validation Tips

- **JSON**: Use a JSON validator (jsonlint.com) before uploading
- **CSV**: Ensure UTF-8 encoding for multi-language characters
- **Test with 2-3 records** first before bulk uploading hundreds
- **Backup existing data** by using the Export feature before bulk upload
