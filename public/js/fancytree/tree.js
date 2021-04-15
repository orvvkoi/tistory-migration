$(function() {

  /*
   * countChildren 재정의
   * node type이 paging인 경우 카운트에서 제외함.
   */
  $.ui.fancytree._FancytreeNodeClass.prototype.countChildren = function(deep) {
    var cl = this.children,
      i,
      l,
      n,
      c;
    if (!cl) {
      return 0;
    }
    c = cl.length;
    n = cl.length;

    let hasPaging = cl.find(n => n.statusNodeType === 'paging');
    if (hasPaging) {
      n -= 1;
    }

    if (deep !== false) {
      for (i = 0, l = c; i < l; i++) {
        n += cl[i].countChildren();
      }
    }

    return n;
  };


  /*
   * fancytree event
   */
  const event = {
    click: (event, data) => {
      // data.node.setSelected(true) will work too
      let node = data.node;
      let targetType = data.targetType;
      //To fix a bug that doesn't appear at once when clicking on the lazy folder.

      if (node.isFolder() && targetType === 'checkbox') {
        node.toggleSelected();
      } else if (!node.isFolder() && targetType !== 'checkbox') {
        node.toggleSelected();
        return false;
      }

      if (node.isLazy() && !node.children && node.isExpanded()) {
        node.toggleExpanded();
      } else if (node.isFolder() && targetType === 'title') {
        node.toggleExpanded();
        return false;
      }
    },
    beforeSelect: (event, data) => {
      // A node is about to be selected: prevent this for folders:
      let node = data.node;

      if (node.isFolder() && !data.originalEvent) {
        return false;
      }
    },
    lazyLoad: (event, data) => {
      let node = data.node;
      let nodeData = node.data;

      if (nodeData.isEmpty === 'false') {
        data.result = $.Deferred((dfd) => {
          const req = UTIL.ajax.get('/api/migration/categories',
            { uniqueKey: { uuid: nodeData.uuid, blogName: nodeData.blogName } });

          req.done((res) => {
            if (res && res.length) {
              dfd.resolve(res);
            } else {
              const postReq = UTIL.ajax.get('/api/migration/posts',
                { uniqueKey: { uuid: nodeData.uuid, blogName: nodeData.blogName, categoryId: nodeData.categoryId } });

              postReq.done(dfd.resolve).fail(dfd.reject);
            }
          }).fail(err => {
            UTIL.modal.alert(err.responseText);
          });
        });
      } else {
        data.result = {
          url: '/api/migration/posts',
          data: {
            uniqueKey: { uuid: nodeData.uuid, blogName: nodeData.blogName, categoryId: nodeData.categoryId },
          },
          cache: false,
        };
      }
    },
    enhanceTitle: (event, data) => {
      let node = data.node;

      if (node.isFolder() && (node.data.isBlog || node.data.isCategory)) {
        data.$title.append(`<span style='color: #b3b2b2;'>  (post : ${node.data.isBlog ? node.data.statistics.post : node.data.entries})</span>`);
      }

    },
    loadChildren: (event, data) => {
      // update node and parent counters after lazy loading

      let node = data.node;
      let children = node.children;

      node.updateCounters();

      let postCount = children.find(i => !(i.data.isCategory || i.data.isBlog));

      if (node.isFolder() && !node.checkbox && postCount) {
        node.checkbox = true;
        //    node.load()
      }

      /* data.node.visit(function(subNode){
           // Load all lazy/unloaded child nodes
           // (which will trigger `loadChildren` recursively)
           if( subNode.isUndefined() && subNode.isExpanded() ) {
               subNode.load();
           }
       });*/
    },
    clickPaging: (event, data) => {
      let node = data.node;
      let nodeData = node.data;

      let params = {
        uniqueKey: nodeData.uniqueKey,
        page: nodeData.page,
      };
      node.replaceWith({
        url: nodeData.url,
        data: params,
      }).done(function(res) {

      });
    },
  };

  const treeDnd5opts = (() => {

    const createMigrationProgressTable = (node, sourceNodes) => {
      const migrationTargetTitle = (() => {
        if (node.data.isBlog) {
          return node.data.name;
        } else {
          return node.data.label || node.data.name;
        }
      })();

      const totalPostCount = sourceNodes.reduce((acc, node) => {
        let sum = 0;

        if (node.data.isBlog) {
          sum = parseInt(node.data.statistics.post);
        } else if (node.data.isCategory) {
          sum = parseInt(node.data.entries);
        } else {
          sum += 1;
        }
        return acc + sum;
      }, 0);

      const row = (node) => {
        const parent = node.parent;
        const isCategory = node.data.isCategory;
        const isBlog = node.data.isBlog;

        const location = parent && parent.data && parent.data.label ? parent.data.label : node.title;

        const title = (() => {
          if (isBlog || isCategory) {
            return `<div class='fa fa-spinner fa-spin fa-2x fa-fw' style='color: #c3c6cf;'></div>`;
          } else {
            return node.title;
          }
        })();

        const _row = `
                <div class='row'>
                    <div class='cell' data-title='Location'>
                        ${location}
                    </div>
                    <div id='progressTitle${node.data.id}' class='cell' data-title='Title'>
                        ${title}
                    </div>
                    <div id='progressStatus${node.data.id}' class='cell' data-title='Status'>
                        <div class='fa fa-spinner fa-spin fa-2x fa-fw' style='color: #c3c6cf;'></div>
                    </div>
                    <div id='progressResult${node.data.id}' class='cell' data-title='Result'>
                        
                    </div>
                </div>`;

        return _row;
      };

      const rows = sourceNodes.map(node => row(node));

      const table = `
                <strong>Migration Target Blog/Category :</strong> ${migrationTargetTitle} <br/> 
                <strong>Total Post Count :</strong> <span id='successCount'>0</span> / ${totalPostCount} <hr>
                <div class='wrapper'>
                    <div id='tableBody' class='table'>
                        <div class='row header blue'>
                            <div class='cell' style='width : 20%'>
                                Location
                            </div>
                            <div class='cell' >
                                Title
                            </div>
                            <div class='cell' style='width : 6%'>
                                Status
                            </div>
                            <div class='cell' style='width : 25%'>
                                Migration Result
                            </div>
                        </div>
                        ${rows}
                    </div>
                </div> `;

      return table;
    };

    const migrationProgress = (node, sourceNodes) => {
      let progressRequest;

      const progressCancelDialog = () => {
        const _this = this;

        $.confirm({
          icon: 'fa fa-exclamation-triangle',
          title: 'Confirmation!',
          content: 'The work in progress will be cancelled.',
          boxWidth: '400px',
          useBootstrap: false,
          animation: 'scale',
          type: 'dark',
          buttons: {
            ok: {
              btnClass: 'btn-red',
              action: function() {
                progressRequest.abort();
                _this.close();
                progressDialog.close();
              },
            },
            cancel: {},
          },
        });

        return false;
      };

      const progressDialogOnOpen = (dialog) => {
        let _this = progressDialog;

        const uniqueKeys = sourceNodes.map(node => (
          {
            uuid: node.data.uuid,
            blogName: node.data.blogName,
            categoryId: node.data.categoryId,
            postId: node.data.postId,
          }
        ));

        const data = {
          uniqueKeys: uniqueKeys,
          targetUniqueKey: {
            uuid: node.data.uuid,
            blogName: node.data.blogName,
            categoryId: node.data.categoryId,
          },
        };

        progressRequest = UTIL.ajax.post('/api/migration/progress', data);

        progressRequest.done((res) => {
          _this.setType('green');
          _this.setIcon('fa fa-check');
          _this.setTitle('Work Complete');

          _this.buttons.done.enable();
          _this.buttons.done.show();
          _this.buttons.close.hide();
          _this.buttons.close.disable();

          $.ui.fancytree.getTree('#tree').visit(function(node) {
            node.setSelected(false);
          });

        }).fail((err) => {
          UTIL.modal.alert(err.responseText);
        }).always(() => {
          socket.disconnect();
        });
      };

      const progressDialogContent = createMigrationProgressTable(node, sourceNodes);

      const progressDialog = $.confirm({
        title: 'Work in progress',
        icon: 'fa fa-spinner fa-spin',
        content: progressDialogContent,
        animation: 'scale',
        boxWidth: '60%',
        type: 'dark',
        useBootstrap: false,
        closeIcon: function() {
          return 'close'; // set a button handler, 'aRandomButton' prevents close.
        },
        closeIconClass: 'fa fa-close',
        buttons: {
          close: {
            action: progressCancelDialog,
          },
          done: {
            isHidden: true,
            isDisabled: true,
            btnClass: 'btn-blue',
          },
        },
        onOpen: progressDialogOnOpen,
      });
    };

    const _dragDrop = (node, data) => {
      let sourceNodes = data.otherNodeList;

      sourceNodes = sourceNodes.filter(n => !n.isFolder() && n.statusNodeType !== 'paging');

      sourceNodes = sourceNodes.reduce(function(pV, cV, cI) {
        let curr = cV.data.isCategory || cV.data.isBlog ? cV.getSelectedNodes() : [cV];
        return [...pV, ...curr];
      }, []);


      /*
      * 대상 카테고리의 게시물과 옮기려는 게시물의 제목을 비교 하여 중복 검사.
      * 로드된 게시물에 대해서만 검사함.
      */
      /*let childrens = (data.hitMode === "over") ? node.children : node.getParent().children;
      let titleList = childrens ? childrens.map(item => item.title) : [];
      let duplicateList = sourceNodes.filter(item=> titleList.includes(item.title)).map(item => item.title);*/

      /*
      * localStorage 저장된 이력으로 중복 검사.
      */
      const duplicates = sourceNodes.reduce((history, item) => {
        if (item.getParentList() && item.getParentList().length > 1) {
          let targetBlogNode = node.getLevel() > 1 ? node.data.isBlog ? node : node.getParentList()[1] : node;
          let targetCategoryId = node.data.id;
          let { name: targetBlogName, url: targetBlogUrl } = targetBlogNode.data;

          let originBlogNode = item.getParentList()[1];
          let originBlogKey = originBlogNode.data.name;

          let migrationHistory = UTIL.LocalStorage.get(originBlogKey) || {};

          let postIds = migrationHistory[targetBlogName]
            && migrationHistory[targetBlogName][targetCategoryId]
            && migrationHistory[targetBlogName][targetCategoryId][item.data.id];

          if (postIds) {
            let postHistory = postIds.map(postId => {
              return {
                node: item,
                title: item.title,
                url: `${targetBlogUrl}/${postId}`,
              };
            });

            history = [...history, ...postHistory];
          }
        }

        return history;
      }, []);

      if (duplicates.length) {
        const confirmContent = duplicates.map((item, index) => `${++index}, <a href='${item.url}' target='_blank'>${item.title}</a>`).join('<br/>');

        $.confirm({
          title: `The migration history exists.`,
          content: confirmContent,
          icon: 'fa fa-exclamation-triangle',
          type: 'red',
          boxWidth: '40%',
          useBootstrap: false,
          buttons: {
            process: {
              btnClass: 'btn-blue',
              keys: ['enter'],
              action: function() {
                migrationProgress(node, sourceNodes);
              },
            },
            duplicate: {
              text: 'Remove Duplicates and process',
              btnClass: 'btn-red',
              action: function() {
                const _this = this;
                const differenceNodes = sourceNodes.filter(node => !duplicates.find(item => item.node === node));

                if (differenceNodes.length) {
                  migrationProgress(node, differenceNodes);
                } else {
                  _this.setTitle('Remove Duplicates and process');
                  _this.setContent('There are no items that can be migrated.');
                  _this.buttons.duplicate.hide();
                  _this.buttons.duplicate.disable();
                  _this.buttons.process.hide();
                  _this.buttons.process.disable();
                  return false;
                }
              },
            },
            cancel: {},
          },
        });
        return;
      }

      migrationProgress(node, sourceNodes);
    };

    const _dragStart = (node, data) => {
      let level = node.getLevel();

      let selectedNodes = $.ui.fancytree.getTree(data.tree).getSelectedNodes();

      selectedNodes = selectedNodes.filter(n => !n.isFolder() && n.statusNodeType !== 'paging');
      let allowDrag = level > 1 && selectedNodes.length ? true : false;

      if (!allowDrag) {
        return false;
      }

      data.effectAllowed = 'all';
      return true;
    };

    const _dragEnter = (node, data) => {
      let sourceNodes = data.otherNodeList;
      let treeOrigin = sourceNodes.find(o => o.tree._ns === '.fancytree-2');

      if (node.tree._ns === data.otherNode.tree._ns || treeOrigin || node.getLevel() === 1) {
        return false;
      }

      return true;
    };

    const _dragOver = (node, data) => {
      // data.node.info("dragOver", data);

      data.hitMode = 'over';
      data.dropEffect = data.dropEffectSuggested;  //"link";
      return true;
    };

    const _dnd5opts = {
      preventVoidMoves: true, // Prevent moving nodes 'before self', etc.
      preventRecursion: true, // Prevent dropping nodes on own descendants
      preventSameParent: true, // Prevent dropping nodes under the same direct parent
      preventForeignNodes: false,
      preventNonNodes: true,
      preventLazyParents: true,
      dropEffectDefault: 'copy',
      autoExpandMS: 1000,
      multiSource: true,  // drag all selected nodes (plus current node)
      focusOnClick: true,
      refreshPositions: true,
      dragStart: _dragStart,
      dragEnter: _dragEnter,
      dragOver: _dragOver,
      dragDrop: _dragDrop,
    };

    return _dnd5opts;
  })();


  let _TREE_OPTION = {
    extensions: ['dnd5', 'multi', 'glyph', 'childcounter'],
    source: { url: '/api/migration/blogs', cache: true },
    checkbox: true,
    selectMode: 3,
    clickFolderMode: 3,
    autoScroll: true,
    keyboard: true,
    childcounter: {
      deep: true,
      hideZeros: true,
      hideExpanded: false,
    },
    click: event.click,
    beforeSelect: event.beforeSelect,
    lazyLoad: event.lazyLoad,
    enhanceTitle: event.enhanceTitle,
    loadChildren: event.loadChildren,
    clickPaging: event.clickPaging,
    glyph: {
      preset: 'awesome5',
      map: {},
    },
    dnd5: treeDnd5opts,
  };

  window.treeInitialize = () => {
    $('#tree').fancytree(_TREE_OPTION);

    // ES9 object destructuring
    let { childcounter, loadChildren, ..._TREE_OPTION2 } = { ..._TREE_OPTION };
    _TREE_OPTION2.checkbox = false;
    _TREE_OPTION2.extensions = ['dnd5', 'multi', 'glyph'];
    _TREE_OPTION2.postProcess = function(event, data) {
      if (data.response) {
        let list = data.response.filter(item => item.folder).map(item => {
          item.lazy = !!item.children;

          if (item.children && item.children.length) {
            item.children = item.children.filter((child) => {
              child.lazy = !child.parent;
              return child;
            });
          }
          return item;
        });

        data.result = list;
      }
    };

    $('#tree2').fancytree(_TREE_OPTION2);
  };

  treeInitialize();

});


/*Enable dnd5 extension and pass options:
    dnd5: {
        // Available options with their default:
        autoExpandMS: 1500,           // Expand nodes after n milliseconds of hovering.
            dropMarkerOffsetX: -24,       // absolute position offset for .fancytree-drop-marker
            // relatively to ..fancytree-title (icon/img near a node accepting drop)
            dropMarkerInsertOffsetX: -16, // additional offset for drop-marker with hitMode = "before"/"after"
            dropMarkerParent: "body",     // Root Container used for drop marker (could be a shadow root)
            effectAllowed: "all",         // Restrict the possible cursor shapes and modifier operations
            // (can also be set in the dragStart event)
            dropEffectDefault: "move",    // Default dropEffect ('copy', 'link', or 'move')
            // when no modifier is pressed (overide in dragDrag, dragOver).
            multiSource: false,           // true: Drag multiple (i.e. selected) nodes.
            // Also a callback() is allowed to return a node list
            preventForeignNodes: false,   // Prevent dropping nodes from another Fancytree
            preventLazyParents: true,     // Prevent dropping items on unloaded lazy Fancytree nodes
            preventNonNodes: false,       // Prevent dropping items other than Fancytree nodes
            preventRecursion: true,       // Prevent dropping nodes on own descendants when in move-mode
            preventSameParent: false,     // Prevent dropping nodes under same direct parent
            preventVoidMoves: true,       // Prevent moving nodes 'before self', etc.
            scroll: true,                 // Enable auto-scrolling while dragging
            scrollSensitivity: 20,        // Active top/bottom margin in pixel
            scrollSpeed: 5,               // Pixel per event
            setTextTypeJson: false,       // Allow dragging of nodes to different IE windows
            sourceCopyHook: null,         // Optional callback passed to `toDict` on dragStart @since 2.38
            // Events (drag support)
            dragStart: null,       // Callback(sourceNode, data), return true, to enable dragging
            dragDrag: $.noop,      // Callback(sourceNode, data)
            dragEnd: $.noop,       // Callback(sourceNode, data)
            // Events (drop support)
            dragEnter: null,       // Callback(targetNode, data), return true, to enable dropping
            dragOver: $.noop,      // Callback(targetNode, data)
            dragExpand: $.noop,    // Callback(targetNode, data)
            dragDrop: $.noop,      // Callback(targetNode, data)
            dragLeave: $.noop      // Callback(targetNode, data)
    },*/

/*All callback methods are passed a data object:

{
    tree: {Fancytree},            // The tree that the event refers to
    node: {FancytreeNode},        // The node that the event refers to (also passed as first argument)
    options: {object},            // Tree options (plugin options accessible as `options.dnd5`)
    originalEvent: {Event},       // The original jQuery Event that caused this callback
    widget: {object},             // The jQuery UI tree widget
    dataTransfer: {DataTransfer}, // Access drag data, drag image, and system drop effect
    dropEffect: {string},         // ('move', 'copy', or 'link') access the requested drop effect
    dropEffectSuggested: {string},// Recommended effect derived from a common key mapping
    effectAllowed: {string},      // ('all', 'copyMove', 'link', 'move', ...) Settable on dragstart only
    useDefaultImage: {boolean},   // (Default: true) Developer can set this to false if a custom setDragImage() was called
    isCancelled: {boolean},       // Set for dragend and drop events
    isMove: {boolean},            // false for copy or link effects
    // Only on these events: dragenter, dragover, dragleave, drop:
    files: null,                  // list of `File` objects if any were dropped (may be [])
        hitMode: {string},            // 'over', 'after', 'before'
    otherNode: {FancytreeNode},   // If applicable: the other node, e.g. drag source, ...
    otherNodeList: {Array(FancytreeNode)},
    otherNodeData: {object},      // set by drop event
}*/
