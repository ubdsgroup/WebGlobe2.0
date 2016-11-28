/* 
 * Copyright (c) 2016 Bruce Schubert <bruce@emxsys.com>.
 * Released under the MIT License
 * http://www.opensource.org/licenses/mit-license.php
 */

/* global WorldWind */

/**
 * Layers content module
 *
 * @param {type} ko
 * @param {type} $
 * @returns {LayersViewModel}
 */
define(['knockout', 'jquery', 'jqueryui', 'bootstrap', 'model/Constants'],
        function (ko, $, jqueryui, boostrap, constants) {

            /**
             * The view model for the Layers panel.
             * @param {Globe} globe The globe that provides the layer manager.
             * @constructor
             */
            function LayersViewModel(globe) {
                var self = this,
                        layerManager = globe.layerManager;

                // Create view data sources from the LayerManager's observable arrays
                self.baseLayers = layerManager.baseLayers;
                self.overlayLayers = layerManager.overlayLayers;
                self.dataLayers = layerManager.dataLayers;
                self.effectsLayers = layerManager.effectsLayers;
                self.widgetLayers = layerManager.widgetLayers;

                // Layer type options
                self.optionValues = ["WMS Layer", "WMTS Layer", "KML file", "Shapefile"];
                self.selectedOptionValue = ko.observable(self.optionValues[0]);
                
                /**
                 * An observable array of servers
                 */
                this.servers = layerManager.servers;
                self.serverAddress = ko.observable("http://neowms.sci.gsfc.nasa.gov/wms/wms");
                this.netcdfDatasets = layerManager.netcdfDatasets;
                self.netcdfDatasetAddress = ko.observable("hdfs://172.17.6.142:9000/user/ubuntu/BCSD");
                
                self.webGlobeServer = 'http://199.109.195.187:8080/webGlobeServer/';
                        
                /**
                 * Toggles the selected layer's visibility on/off
                 * @param {Object} layer The selected layer in the layer collection
                 */
                self.onToggleLayer = function (layer) {
                    layer.enabled(!layer.enabled());
                    globe.redraw();
                };


                /**
                 * Opens a dialog to edit the layer settings.
                 * @param {Object} layer The selected layer in the layer collection
                 */
                self.onEditSettings = function (layer) {
                    
                    $('#opacity-slider').slider({
                        animate: 'fast',
                        min: 0,
                        max: 1,
                        orientation: 'horizontal',
                        slide: function (event, ui) {
                            //console.log(layer.name() + ":  " + layer.opacity());
                            layer.opacity(ui.value);
                        },
                        step: 0.1
                    });
                    
                    $("#layer-settings-dialog").dialog({
                        autoOpen: false,
                        title: layer.name()
                    });
                    
                    //console.log(layer.name() + ":  " + layer.opacity());
                    $("#opacity-slider").slider("option", "value", layer.opacity());
                    $("#layer-settings-dialog").dialog("open");
                };
                
                
                /**
                 * Opens the Add Layer dialog.
                 */
                self.onAddLayer = function() {
                    $("#add-layer-dialog").dialog({
                        autoOpen: false,
                        title: "Add Layer"
                    });
                    
                    $("#add-layer-dialog").dialog("open");
                };
                
                
                self.onAddServer  = function() {
                    layerManager.addServer(self.serverAddress());
                    return true;
                };

                self.onRemoveServer = function(layerNode) {
                    // TODO: Implement this to remove a WMS server from the list
                    return true;
                };
                
                self.onAddNetcdfDataset = function() {
                    layerManager.addNetcdfDataset(self.netcdfDatasetAddress());
                    return true;
                };
                
                self.onCreateNetcdfLayerImages = function(layerInfo, from, to) {
                    if (layerInfo.address  !== "") {                        
                            $('#create-images' + layerInfo.layerview.id()).html("<span class='fa fa-spinner fa-spin'></span> Creating images ...");
                            $('#create-images' + layerInfo.layerview.id()).prop('disabled',true);
                            
                            $.ajax({
                                url: self.webGlobeServer + 'CreateImages',
                                cache: false,
                                contentType: 'application/json; charset=utf-8',
                                type: 'POST',
                                data: JSON.stringify({
                                    url: layerInfo.address,
                                    from: from,
                                    to: to
                                }),
                                success: function (data) {
                                    // alert('added');
                                    layerInfo.imagesAddress = data.imagesAddress;
                                    layerInfo.imageMinDate = data.imageMinDate;
                                    layerInfo.imageMaxDate = data.imageMaxDate;

                                    $('#load-start-date' + layerInfo.layerview.id()).attr({
                                        "max" : data.imageMaxDate,
                                        "min" : data.imageMinDate
                                    });
                                    $('#load-start-date' + layerInfo.layerview.id()).val(data.imageMinDate);
                                    
                                    $('#load-end-date' + layerInfo.layerview.id()).attr({
                                        "max" : data.imageMaxDate,
                                        "min" : data.imageMinDate
                                    });
                                    $('#load-end-date' + layerInfo.layerview.id()).val(data.imageMaxDate);
                                    
                                    $('#create-images' + layerInfo.layerview.id()).html("Create images");
                                    $('#create-images' + layerInfo.layerview.id()).prop('disabled',false);
                                }
                            }).fail(function (xhr, textStatus, err) {
                                alert(err);
                                
                                $('#create-images' + layerInfo.layerview.id()).html("Create images");
                                $('#create-images' + layerInfo.layerview.id()).prop('disabled',false);
                            });                            
                        }
                    else{
                            alert('No URL entered.');
                        }

                    return true;
                };
                
                self.onLoadNetcdfLayerImages = function(layerInfo, from, to) {
                    if (layerInfo.imagesAddress  !== "") {
                            layerInfo.startDate = from;
                            $.ajax({
                                url: self.webGlobeServer + 'LoadImages',
                                cache: false,
                                type: 'POST',
                                data: {
                                    url: layerInfo.imagesAddress,
                                    from: from,
                                    to: to
                                },
                                success: function (data) {
                                    // alert('added');
                                    var imageUrls = data.split(",");
                                                                                                                                
                                    var len = imageUrls.length - 1;

                                    layerInfo.images.removeAll();
                                    for (var i = 0; i < len; ++i) {
                                        layerInfo.images.push(new WorldWind.SurfaceImage(
                                            new WorldWind.Sector(-90, 90, -180,180),imageUrls[i]));
                                    }

                                    $('#index-of-show-date' + layerInfo.layerview.id()).attr({
                                        "max" : len-1,
                                        "min" : 0
                                    });
                                    
                                    $('#index-of-show-date' + layerInfo.layerview.id()).val(0);
                                    $('#index-of-show-date' + layerInfo.layerview.id()).change();
                                }
                            }).fail(function (xhr, textStatus, err) {
                                alert(err);
                            });                            
                        }
                    else{
                            alert('No URL entered.');
                        }

                    return true;
                };

                self.onInputShowDate = function(layerInfo) {
                    var index = parseInt($('#index-of-show-date' + layerInfo.layerview.id()).val());
                    var imagesource = layerInfo.images()[index]._imageSource;
                    $('#show-date' + layerInfo.layerview.id()).val(imagesource.substring(imagesource.lastIndexOf('/')+1));
                    
                    layerInfo.layer.removeAllRenderables();
                    layerInfo.layer.addRenderable(layerInfo.images()[index]);
                    globe.redraw();
                    return true;
                };                
                
                /**
                 * Add the supplied layer from the server's capabilities to the active layers
                 */
                this.onServerLayerClicked = function(layerNode, event){
                    if (!layerNode.isChecked()) {
                        // TODO: Open dialog to select a layer category
                        layerManager.addLayerFromCapabilities(layerNode.layerCaps, constants.LAYER_CATEGORY_OVERLAY);
                    } else {
                        layerManager.removeLayer(layerNode.layerCaps);
                    }
                    return true;
                };
                
                /**
                 * Add the supplied layer from the server's capabilities to the active layers
                 */
                this.onNetcdfDatasetLayerClicked = function(layerNode, event){
                    if (!layerNode.isChecked()) {
                        // TODO: Open dialog to select a layer category
                        layerManager.addLayerFromCapabilities(layerNode.layerCaps, constants.LAYER_CATEGORY_OVERLAY);
                    } else {
                        layerManager.removeLayer(layerNode.layerCaps);
                    }
                    return true;
                };
            }

            return LayersViewModel;
        }
);
