public with sharing class QueryCraftController {

    private static final Integer HARD_LIMIT    = 2000;
    private static final Integer DEFAULT_LIMIT = 100;

    private static final Set<String> BLOCKED_KEYWORDS = new Set<String>{
        'INSERT','UPDATE','UPSERT','DELETE','UNDELETE',
        'MERGE','CONVERTLEAD','EMPTYRECYCLEBIN',
        'DROP','TRUNCATE','ALTER','CREATE'
    };

    @AuraEnabled(cacheable=true)
    public static List<String> getAllQueryableObjects() {
        List<String> result = new List<String>();
        try {
            for (EntityDefinition ed : [
                SELECT QualifiedApiName
                FROM   EntityDefinition
                WHERE  IsQueryable = true
                   AND IsDeprecatedAndHidden = false
                ORDER BY QualifiedApiName ASC
                LIMIT  2000
            ]) {
                result.add(ed.QualifiedApiName);
            }
        } catch (Exception e) {
            Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
            result.addAll(gd.keySet());
            result.sort();
        }
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static List<String> getQueryableFieldsForObject(String objectName) {
        List<String> fields = new List<String>();
        try {
            if (String.isBlank(objectName)) {
                throw new AuraHandledException('Object name is required.');
            }

            String safeName = objectName.trim().replaceAll('[^a-zA-Z0-9_]', '');

            Schema.DescribeSobjectResult[] results;
            try {
                results = Schema.describeSObjects(new List<String>{safeName});
            } catch(Exception ex) {
                throw new AuraHandledException('Object not found: ' + safeName);
            }
            
            if (results.isEmpty()) {
                throw new AuraHandledException('Object not found: ' + safeName);
            }

            Map<String, Schema.SObjectField> fieldMap =
                results[0].fields.getMap();

            for (Schema.SObjectField f : fieldMap.values()) {
                Schema.DescribeFieldResult fd = f.getDescribe();
                if (fd.isAccessible()) {
                    fields.add(fd.getName());
                }
            }
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Field load error: ' + e.getMessage());
        }
        fields.sort();
        return fields;
    }

    @AuraEnabled(cacheable=false)
    public static List<Map<String, Object>> executeQuery(String query) {
        if (String.isBlank(query)) {
            throw new AuraHandledException('Query cannot be empty.');
        }

        String upperQuery = query.toUpperCase().trim();

        for (String kw : BLOCKED_KEYWORDS) {
            if (upperQuery.startsWith(kw + ' ') || upperQuery.contains(' ' + kw + ' ')) {
                throw new AuraHandledException(
                    'Security violation: "' + kw + '" is not permitted in QueryCraft.'
                );
            }
        }

        if (!upperQuery.startsWith('SELECT ')) {
            throw new AuraHandledException('Only SELECT queries are allowed.');
        }
        if (!upperQuery.contains(' LIMIT ')) {
            query = query.trim() + ' LIMIT ' + DEFAULT_LIMIT;
        } else {
            Pattern p = Pattern.compile('(?i)LIMIT\\s+(\\d+)');
            Matcher m = p.matcher(query);
            if (m.find()) {
                Integer existing = Integer.valueOf(m.group(1));
                if (existing > HARD_LIMIT) {
                    query = m.replaceFirst('LIMIT ' + HARD_LIMIT);
                }
            }
        }

        List<Map<String, Object>> resultList = new List<Map<String, Object>>();
        try {
            for (SObject record : Database.query(query)) {
                resultList.add(record.getPopulatedFieldsAsMap());
            }
            return resultList;
        } catch (QueryException qe) {
            throw new AuraHandledException('SOQL Error: ' + qe.getMessage());
        } catch (Exception e) {
            throw new AuraHandledException('Unexpected error: ' + e.getMessage());
        }
    }
}