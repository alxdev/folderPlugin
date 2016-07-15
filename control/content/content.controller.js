/**
 * Created by zain on 10/01/16.
 */
var folderPluginApp = angular.module('folderPlugin', ['ui.tinymce']);

folderPluginApp.controller('folderPluginCtrl', ['$scope', function ($scope) {
    var tmpCarousalData=null;
    var editor = new buildfire.components.carousel.editor("#carousel");
    var _buildfire = {
        plugins: {
            dataType: "pluginInstance",
            data: []
        }
    };
    var _design = {
        backgroundImage: null,
        selectedLayout: 1,
        backgroundblur: 0
    };
    var plugins = new buildfire.components.pluginInstance.sortableList("#plugins", [], { showIcon: true, confirmDeleteItem: false });
    var tmrDelay = null;
    var updateItem = null;

    $scope.editorOptions = folderPluginShared.getEditorOptions();

//    $scope.data = folderPluginShared.getDefaultScopeData();

    $scope.masterData = folderPluginShared.getDefaultScopeData();

    $scope.datastoreInitialized = false;

    function isUnchanged(data) {
        return angular.equals(data, $scope.masterData);
    }

    function updateMasterItem(data) {
        $scope.masterData = angular.copy(data);
    }

    /*
     * Go pull any previously saved data
     * */
    buildfire.datastore.getWithDynamicData(function (err, result) {
        if (!err) {
            $scope.datastoreInitialized = true;
        } else {
            console.error("Error: ", err);
            return;
        }

        if(!result.id){
            result.data=folderPluginShared.getDefaultScopeData();
        }

        if (result && result.data && !angular.equals({}, result.data)) {
            updateMasterItem(result.data);
            $scope.data = result.data;
            $scope.id = result.id;
            if ($scope.data && $scope.data.content && $scope.data.content.carouselImages) {
                editor.loadItems($scope.data.content.carouselImages);
            }

            if ($scope.data && $scope.data._buildfire && $scope.data._buildfire.plugins && $scope.data._buildfire.plugins.result) {
                var pluginsData = folderPluginShared.getPluginDetails($scope.data._buildfire.plugins.result, $scope.data._buildfire.plugins.data);
                if ($scope.data.content && $scope.data.content.loadAllPlugins) {
                    if(pluginsData.length){
                        plugins.loadItems(pluginsData, "loadAll");
                        $("#plugins").find(".carousel-items").hide();
                    }else{
                        plugins.loadAllItems();
                        $("#plugins").find(".carousel-items").hide();
                    }
                } else {
                    plugins.loadItems(pluginsData, "selected");
                    $("#plugins").find(".carousel-items").show();
                }
            }

            if ($scope.data && !$scope.data._buildfire) {
                updateItem = angular.copy($scope.data);
                updateItem._buildfire = _buildfire;
                updateMasterItem(updateItem);
                $scope.data = angular.copy(updateItem);
            }

            if ($scope.data && !$scope.data.design) {
                updateItem = angular.copy($scope.data);
                updateItem.design = _design;
                updateMasterItem(updateItem);
                $scope.data = angular.copy(updateItem);
            }

            if (tmrDelay) clearTimeout(tmrDelay);
        }


        /*
         * watch for changes in data and trigger the saveDataWithDelay function on change
         * */
        $scope.$watch('data', saveDataWithDelay, true);
        folderPluginShared.digest($scope);
    });

    /*
     * Call the datastore to save the data object
     */
    var saveData = function (newObj) {
        if (!$scope.datastoreInitialized) {
            console.error("Error with datastore didn't get called");
            return;
        }

        if (newObj == undefined) return;
        if ($scope.frmMain.$invalid) {
            console.warn('invalid data, details will not be saved');
            return;
        }

        if (newObj._buildfire && newObj._buildfire.plugins) {
            newObj._buildfire.plugins.result = plugins.items;
        }

        updateMasterItem(newObj);

        folderPluginShared.save(newObj);
    };

    /*
     * create an artificial delay so api isnt called on every character entered
     * */
    var saveDataWithDelay = function (newObj) {

        if (tmrDelay) clearTimeout(tmrDelay);
        if (isUnchanged(newObj)) {
            return;
        }
        if(newObj.default){
            newObj=folderPluginShared.getDefaultScopeBlankData();
            if(tmpCarousalData){
                editor.loadItems(tmpCarousalData);
                newObj.content.carouselImages=tmpCarousalData;
                tmpCarousalData=null;
            }else{
                editor.loadItems([]);
            }

            $scope.data = newObj;
        }
        tmrDelay = setTimeout(function () {
            saveData(newObj);
        }, 500);
    };

    var getPluginsIds = function (plugins) {
        var pluginsIds = [];
        for (var i = 0; i < plugins.length; i++) {
            pluginsIds.push(plugins[i].instanceId);
        }
        return pluginsIds;
    }

    // this method will be called when a new item added to the list
    editor.onDeleteItem = editor.onItemChange = editor.onOrderChange = function () {

        $scope.data.content.carouselImages = editor.items;
        folderPluginShared.digest($scope);
    };

    editor.onAddItems= function (items) {
        tmpCarousalData=items;
        $scope.data.content.carouselImages = editor.items;
        folderPluginShared.digest($scope);
    }

    plugins.onAddItems = function () {
        var scopeItems = $scope.data._buildfire.plugins.data;
        var itemIds = getPluginsIds(plugins.items);
        for (var i = 0; i < itemIds.length; i++) {
            if (scopeItems.indexOf(itemIds[i]) == -1) {
                scopeItems.push(itemIds[i]);
            }
        }

        folderPluginShared.digest($scope);
    };

    plugins.onDeleteItem = function (item, index) {
        if (plugins.items.length == 0) {
            $scope.data._buildfire.plugins.data = [];
        } else {
            $scope.data._buildfire.plugins.data.splice(index, 1);
        }

        folderPluginShared.digest($scope);
    };

    plugins.onOrderChange = function (item, oldIndex, newIndex) {
        var items = $scope.data._buildfire.plugins.data;

        var tmp = items[oldIndex];

        if (oldIndex < newIndex) {
            for (var i = oldIndex + 1; i <= newIndex; i++) {
                items[i - 1] = items[i];
            }
        } else {
            for (var i = oldIndex - 1; i >= newIndex; i--) {
                items[i + 1] = items[i];
            }
        }

        items[newIndex] = tmp;

        $scope.data._buildfire = {
            "plugins": {
                "dataType": "pluginInstance",
                "data": items
            }
        };

        folderPluginShared.digest($scope);
    };

    plugins.onLoadAll = function () {
        $scope.data.content.loadAllPlugins = true;

        $("#plugins").find(".carousel-items").hide();
        folderPluginShared.digest($scope);
    };

    plugins.onUnloadAll = function (items) {
        $scope.data.content.loadAllPlugins = false;
        $("#plugins").find(".carousel-items").show();
        folderPluginShared.digest($scope);
    };

    var digest = function () {
        if (!$scope.$$phase && !$scope.$root.$$phase) {
            $scope.$apply();
        }
    };
}]);