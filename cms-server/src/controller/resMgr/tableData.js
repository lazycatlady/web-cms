const Base = require('../base.js');
import util from '../../../utils/util'
const nodeExcel = require("excel-export"); //首先，引入excel模块：

module.exports = class extends Base {
    async indexAction() {
        return 'hahah'
    }

    async queryTableDataByIdAction() {
        try {
            let tableId = this.get('tableId')

            let table = await this.model('resource_table').getTableInfo(tableId)
            let fileds = await this.model('resource_table_column').getColumnList(tableId,'UPDATE')
            fileds = fileds.map(item => {
                if (item.ATTRIBUTE_TYPE != '2')
                    return item.COLUMN_NAME
            })
            fileds = fileds.filter(item => {
                return item != undefined
            })
            const data = await this.model(table.table_name).field(fileds).where({
                id: this.get('id')
            }).find()
            return this.success(data)
        } catch (err) {
            return this.fail(err)
        }
    }
    // 导出Excel
    async exportExcelAction() {
        const res = this.ctx.res;
        const req = this.ctx.req;
        const tableId = this.get('tableId')
        let queryColumn = this.get('queryColumn')
        let queryKey = this.get('queryKey')
        let query = this.get('query')
        let whereObj = {}
        if (!!queryColumn) {
            if (queryKey.includes(',')) {
                whereObj[`${queryColumn}`] = ['IN', `${queryKey}`]
            } else {
                whereObj[`${queryColumn}`] = ['like', `%${queryKey}%`]
            }
        }
        if (query && query != '{}' && JSON.stringify(query) != '{}') {
            query = JSON.parse(query)
            let key = Object.keys(query)[0]
            whereObj[key] = ['=', `${query[key]}`]
        }
        if (!!queryKey) {
            whereObj = await this.model('tableData').getWhereObj(query, queryColumn, queryKey, tableId)
        }

        var confs = [];
        var conf = {};
        let colArr = []
        let colunms = await this.model('resource_table_column').getColumnList(tableId, 'EXPORT')
        let tables = await this.model('resource_table').getTableInfo(tableId)

        colunms.map(item => {
            colArr.push({
                caption: item.COLUMN_CNAME,
                type: 'string'
            })
        })
        let colunmsQuery = colunms.map(item => {
            return item.COLUMN_NAME
        })
        conf.cols = colArr;
        let tableData = await this.model('tableData').getTableData(tableId, 'EXPORT', whereObj)
        let infos = []
        tableData.map(item => {
            let datas = []
            Object.keys(item).map(el => {
                datas.push(String(item[el]).replace('null',''))
            })
            infos.push(datas)
        })

        conf.rows = infos
        conf.name = tables.table_name;
        confs.push(conf);

        var result = nodeExcel.execute(confs);

        var name = encodeURI(tables.resource_name);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats;charset=utf-8');
        res.setHeader("Content-Disposition", "filename=" + name + ".xlsx");
        res.end(result, 'binary');
    }
    // 根据配置查询某表的数据
    async queryTableDataAction() {
        // try {
        const _this = this
        let tableId = this.get('tableId')
        let pageSize = this.get('pageSize')
        let pageNumber = this.get('pageNumber')

        let queryColumn = this.get('queryColumn')
        let queryKey = this.get('queryKey')
        let order = this.get('order')

        let table = await this.model('resource_table').getTableInfo(tableId);
        let displayColumn = await this.model('resource_table_column').getColumnList(tableId);
        let queryColumns = [],
            displayColumnArr = []
        let data = {};

        displayColumn.map(item => {
            switch (item.PROPERTY_TYPE) {
                case '1': // 文本框形式不需要翻译
                case '3': // 日期
                case '5': // 日期时间
                    displayColumnArr.push(item.COLUMN_NAME)
                    break;
                case '2': // 有外键关系,需要翻译
                    displayColumnArr.push(item.COLUMN_NAME);
                    displayColumnArr.push(`(SELECT NAME FROM (${item.TYPESQL}) tras WHERE tras.id=${item.COLUMN_NAME}) ${item.COLUMN_NAME}_TEXT`)
                    break;
                case '4': //字段数据
                    displayColumnArr.push(`(${item.TYPESQL}) ${item.COLUMN_NAME}`)
                    break;
                case '7': //自动填充
                    displayColumnArr.push(`${item.TYPESQL} ${item.COLUMN_NAME}`);
                    break;
                case '13': //附件字段的话，不在列表中查询
                    break;
                default:
                    displayColumnArr.push(item.COLUMN_NAME)
                    break;
            }
        })
        let whereObj = {}
        let query = this.get('query')
        let pArr = [],
            temp = {}
        if (query && query != '{}' && JSON.stringify(query) != '{}') {
            query = JSON.parse(query)
            let key = Object.keys(query)[0]
            whereObj[key] = ['=', `${query[key]}`]
        }
        if (!!queryKey) {
            whereObj = await this.model('tableData').getWhereObj(query, queryColumn, queryKey, tableId)
        }
        if (order && order.length > 0) {
            data = await this.model(table.table_name)
                .field(displayColumnArr.join(',')).page(pageNumber, pageSize).where(table.where_sql).where(whereObj).order(order).alias('t').countSelect();
        } else {
            data = await this.model(table.table_name)
                .field(displayColumnArr.join(',')).page(pageNumber, pageSize).where(table.where_sql).where(whereObj).order(table.orderby_sql).alias('t').countSelect();
        }
        return this.success(data)
        // } catch (err) {
        //     return this.fail(err)
        // }
    }
    getData(queryColumns, item, queryKey) {
        const vm = this
        return new Promise(async resolve => {
            let wjData = await this.model().query(`(SELECT id FROM (${item.TYPESQL}) tras WHERE tras.name like '%${queryKey}%')`)
            if (wjData.length > 0) {
                queryColumns.push({
                    type: true,
                    key: item.COLUMN_NAME,
                    value: wjData[0].id
                })
            }
            resolve()
        })
    }
    // 添加资源
    async addAction() {
        try {
            let tableId = this.post('tableId')
            let form = this.post('form')
            // 获取主键
            let primaryKey = await this.model('resource_table_column').getPrimaryKey(tableId)
            let idKey = '',
                primaryKeyValue = ''

            if (JSON.stringify(primaryKey) != '{}') {
                let sql = 'select ' + primaryKey.typesql + ' Id from dual'
                if (!!primaryKey.typesql) {
                    let tData = await this.model('resource_table_column').getTypeSqlData(sql)
                    primaryKeyValue = tData[0].Id
                } else {
                    primaryKeyValue = util.getUUId()
                }
                idKey = primaryKey.column_name.toLowerCase()
                form[idKey] = primaryKeyValue
            }
            let table = await this.model('resource_table').getTableInfo(tableId)
            let affectedRows = await this.model(table.table_name).add(form);
            let whereObj = {}
            whereObj[idKey] = primaryKeyValue

            let data = await this.model(table.table_name).where(whereObj).find()

            let dataLog = {
                id: util.getUUId(),
                operater_id: this.header('token'),
                operate_type: 'add',
                tablename: table.table_name,
                content: table.resource_name,
                old_value: JSON.stringify(form)
            }

            await this.model('resource_log').add(dataLog)
            return this.success(data)
        } catch (ex) {
            console.log(ex)
            return this.fail(ex)
        }
    }

    // 修改资源
    async editAction() {
        try {
            let tableId = this.post('tableId')
            let updateInfo = this.post('form')
            let primaryKey = this.post('primaryKey')
            let table = await this.model('resource_table').getTableInfo(tableId)

            let oldData = await this.model(table.table_name).where(
                `${primaryKey.name}='${primaryKey.value}'`
            ).find()

            let affectedRows = await this.model(table.table_name).where(
                `${primaryKey.name}='${primaryKey.value}'`
            ).update(updateInfo);

          
            let dataLog = {
                id: util.getUUId(),
                operater_id: this.header('token'),
                operate_type: 'edit',
                tablename: table.table_name,
                content: table.resource_name,
                old_value: JSON.stringify(oldData),
                new_value: JSON.stringify(updateInfo)
            }

            await this.model('resource_log').add(dataLog)

            return this.success(affectedRows)
        } catch (ex) {
            return this.fail(ex)
        }

    }
    /**
     * 删除表资源
     */
    async deleteAction() {
        try {
            let tableId = this.post('tableId')
            let updateInfo = this.post()
            delete updateInfo.tableId;
            let table = await this.model('resource_table').getTableInfo(tableId)

            let oldData = await this.model(table.table_name).where(updateInfo).find()

            let affectedRows = await this.model(table.table_name).where(updateInfo).delete();


            let dataLog = {
                id: util.getUUId(),
                operater_id: this.header('token'),
                operate_type: 'delete',
                tablename: table.table_name,
                content: table.resource_name,
                old_value: JSON.stringify(oldData)
            }

            await this.model('resource_log').add(dataLog)

            return this.success(affectedRows)
        } catch (ex) {
            return this.fail(ex)
        }
    }
};